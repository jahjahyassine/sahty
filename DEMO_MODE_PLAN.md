# Sahty — Passage en mode démo sans base de données

## 1. Cartographie des dépendances Prisma / PostgreSQL

### Infrastructure
| Fichier | Dépendance | Remplacement |
|---|---|---|
| `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts` | Modèle + seed PostgreSQL | Supprimés. Le modèle est repris dans `src/lib/demo/types.ts`, le seed dans `src/lib/demo/fixtures.ts`. |
| `src/lib/prisma.ts` | Client Prisma singleton | Supprimé. |
| `package.json` | `@prisma/client`, `prisma`, scripts `db:*`, `build: prisma generate`, bloc `prisma.seed`, `bcryptjs` | Dépendances et scripts retirés ; `build` devient `next build`. Auth démo sans bcrypt. |
| `Dockerfile` | `openssl`, `DATABASE_URL` de build, `prisma generate`, copie de `prisma/`, volume uploads | Image Node simple, plus de Prisma/PostgreSQL. |
| `docker-compose.yml` | Service `postgres`, healthcheck, `DATABASE_URL`, `prisma migrate deploy` | Service app seul, plus de DB ni de migration. |
| `.env.example` | `DATABASE_URL` | Retiré. Variables optionnelles IA documentées. |
| `README.md` | Procédure PostgreSQL/Prisma | Réécrit pour le mode démo navigateur. |

### Bibliothèques serveur
| Fichier | Usage Prisma | Remplacement |
|---|---|---|
| `src/lib/auth.ts` | `user.findUnique`, `auditLog.create`, type `Role` | Utilisateurs statiques `src/lib/demo/fixtures.ts`, mot de passe démo, audit via repository (ou aucun audit serveur). JWT NextAuth conservé. |
| `src/lib/session.ts` | `user.findUnique` + `notification.count` | Lecture des fixtures statiques par `session.user.id`; compteur non-lu calculé côté client par le repository. |
| `src/lib/roles.ts` | `patient.findUnique`, `doctor.findUnique` | Lookup fixtures. |
| `src/lib/api.ts` | `Role` Prisma | Type `Role` du module démo. |
| `src/lib/access.ts` | grants, link tokens, `Prisma.TransactionClient` | Règles de portée pures (`scopeRank`, `grantIsActive`) + repository navigateur. |
| `src/lib/audit.ts` | `auditLog.create` | Service mock `demoRepository.logAudit`. |
| `src/lib/notifications.ts` | `notification.create` | Service mock `demoRepository.createNotification`. |
| `src/lib/tokens.ts` | crypto Node pour jetons | Codes/QR démo générés côté navigateur (`src/lib/demo/codes.ts`), sans revendication de sécurité réelle. |
| `src/lib/storage.ts` | Uploads disque | Supprimé (les pièces jointes ne sont plus centrales en démo). |
| `src/lib/client.ts` | Appels API métier | Conservé uniquement pour les routes IA optionnelles. |
| `src/middleware.ts` | Aucun Prisma (JWT) | Conservé tel quel. |

### Routes API (33 fichiers)
Toutes les routes `api/doctor/**`, `api/patient/**`, `api/notifications/**`, `api/me`, `api/files/**`, `api/auth/register` lisent/écrivent Prisma. Comme les données de démo vivent dans `localStorage`, ces routes HTTP ne peuvent pas être la source de vérité. **Elles sont supprimées** ; l’UI appelle directement le repository. Restent :
- `api/auth/[...nextauth]` : authentification JWT sur comptes fixtures.
- `api/ai/report` et `api/ai/transcribe` (nouveaux, optionnels) : appels fournisseur IA avec clé côté serveur.

### Pages / composants serveur qui requêtent Prisma
| Fichier | Traitement |
|---|---|
| `doctor/page.tsx` | Devient composant client alimenté par le repository. CTA principale = nouvelle consultation. |
| `doctor/consultations/page.tsx` | Composant client (recherche/filtres locaux). |
| `doctor/consultations/[id]/page.tsx` | Remplacé par l’atelier d’enregistrement / transcription / rapport. |
| `doctor/consultations/[id]/edit/page.tsx` | Redirige vers l’atelier (une seule voie). |
| `doctor/consultations/[id]/finish/page.tsx` | Revue finale + approbation explicite + partage. |
| `doctor/patients/[patientId]/page.tsx` + `dossier-view.tsx` | Dossier client via repository. |
| `doctor/patients/page.tsx` + `patients-view.tsx` | Liste des patients/grants via repository. |
| `doctor/profile/page.tsx` + formulaire | Profil client via repository. |
| `patient/page.tsx`, `patient/consultations/**`, `patient/access/**`, `patient/claim/**`, `patient/qr/**`, `patient/profile/**` | Composants clients via repository. |
| `notifications/page.tsx` | Composant client via repository. |
| `components/shared/app-shell.tsx`, `sidebar.tsx`, `topbar.tsx`, `notifications-*` | Types démo ; compteur et notifications lus dans le repository. |
| `components/doctor/consultation-form.tsx` | Supprimé/remplacé par l’atelier. |

### Tests
`tests/access.test.ts` importe `AccessScope` depuis `@prisma/client` : réécrit sur `src/lib/demo/types.ts`. Ajout de tests repository (création, approbation, liaison, QR, reset) et du générateur de rapport local.

## 2. Architecture cible

```
src/lib/demo/
  types.ts        types + unions (Role, AccessScope, ConsultationStatus…)
  fixtures.ts     utilisateurs, patients, médecins, consultations, grants, notifications
  storage.ts      persistance localStorage versionnée + fallback mémoire
  repository.ts   source de vérité unique (lectures/écritures + abonnements)
  codes.ts        codes/QR démo côté navigateur
  auth.ts         vérification des comptes fixtures
  use-demo.ts     hooks React (useSyncExternalStore/abonnements)
src/lib/ai/
  types.ts
  prompts.ts
  validation.ts
  local-report-provider.ts
  report-provider.ts
  speech-recognition.ts
src/lib/recording/
  media-recorder.ts
  recording-utils.ts
```

- **Source de vérité unique** : `demoRepository`. Aucun composant ne touche `localStorage`.
- **Persistance** : clé `Sahty.demo.v1`, rechargée au refresh, réinitialisable.
- **Réactivité** : abonnement + hook `useDemoSnapshot` ; les mutations déclenchent un rendu cohérent (pas de doublons état/stockage).
- **Auth** : NextAuth JWT, comptes fixtures, `getSessionUser` sans DB. Les layouts passent l’utilisateur au shell client ; les noms/profils édités sont superposés depuis le repository.
- **QR** : payload déterministe `Sahty://patient/SH-XXXXXX` + saisie manuelle. Résolution par `getPatientByQrCode`. Mention explicite : QR de démonstration, pas une authentification ni un consentement réel.
- **Parcours médecin unique** :
  1. `/doctor` → CTA « Nouvelle consultation »
  2. `/doctor/consultations/new` → scan QR ou code patient
  3. `/doctor/consultations/[id]` → enregistrement audio réel, transcription live si navigateur compatible, génération de rapport, édition
  4. `/doctor/consultations/[id]/finish` → revue finale, approbation explicite, partage
  5. `/doctor/patients/[patientId]` → dossier/historique + démarrer une consultation
- **Audio** : `MediaRecorder` réel (micro, pause/reprise/stop, chrono). L’audio reste en mémoire de session ; transcript/rapport sont persistés.
- **Transcription** : Web Speech API pour le live (chrome/edge) ; si indisponible, message clair + transcription après enregistrement via route serveur optionnelle, sinon saisie manuelle.
- **Rapport** : abstraction fournisseur. Par défaut générateur local déterministe clairement étiqueté « démo ». Si `AI_API_KEY` est configurée côté serveur, la route `/api/ai/report` utilise un fournisseur compatible OpenAI. Aucune clé dans le client.
- **Approbation** : `approveConsultation(id, report)` enregistre le rapport, `approvedAt`, passe en `COMPLETED`. Le partage (`linkConsultation`) passe en `LINKED` et notifie le patient.

## 3. Ordre d’exécution

1. Créer types/fixtures/storage/repository/hooks/auth démo.
2. Brancher NextAuth + session + layouts sur les fixtures.
3. Convertir les pages médecin (dashboard, liste, nouveau, atelier, finish, dossier, patients, profil).
4. Ajouter l’enregistrement, la transcription et les fournisseurs IA.
5. Convertir les pages patient + notifications + profils.
6. Supprimer Prisma/PostgreSQL/Docker DB/env/routes API métier.
7. Mettre à jour messages AR/FR, README, tests.
8. Vérifier : grep Prisma/Postgres, tests, lint, build, parcours manuel documenté.

## 4. Limites annoncées
- Les QR, codes et grants sont des données de démonstration, pas de la sécurité réelle.
- La transcription live dépend de la Web Speech API du navigateur.
- Le rapport local est heuristique et doit être revu ; le fournisseur IA externe est optionnel et nécessite une clé serveur.
- L’audio n’est pas persisté après rechargement (seuls transcript/rapport le sont).
