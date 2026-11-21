#صحتي · Sahty

Démonstration web bilingue **arabe (RTL) / français (LTR)** du parcours « consultation → dossier patient ». Cette version fonctionne **sans base de données** : les données vivent dans le navigateur.

> **Version de démonstration.** Les comptes sont publics, les QR codes et « consentements » sont fictifs, et aucune donnée de santé réelle ne doit être saisie. Avant tout usage réel, la loi marocaine 09-08 et les exigences de la CNDP s’appliquent (voir plus bas).
>
> ملاحظة: هذا المشروع عرض تجريبي فقط. لا تستخدم بيانات صحية حقيقية. الحسابات ورموز QR ثابتة وغير آمنة.

---

## Sommaire

- [Démarrage rapide](#démarrage-rapide)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Parcours de test](#parcours-de-test)
- [Persistance et réinitialisation](#persistance-et-réinitialisation)
- [Configuration](#configuration)
- [Limites de la démo](#limites-de-la-démo)
- [Stack](#stack)
- [Scripts et tests](#scripts-et-tests)

---

## Démarrage rapide

Prérequis : **Node.js 20+** (aucune base de données, aucun service externe requis).

```bash
npm install
cp .env.example .env
npm run dev
```

Ouvrez <http://localhost:3000> : l’application redirige vers `/ar` (bascule vers `/fr` via le sélecteur de langue).

Production locale :

```bash
npm run build
npm run start
```

Docker (image Node simple, sans PostgreSQL) :

```bash
docker compose up --build
```

---

## Comptes de démonstration

Mot de passe commun pour les quatre comptes : **`Demo1234!`**

| Rôle | E-mail | Profil |
| --- | --- | --- |
| Médecin | `dr.alami@demo.ma` | Dr. Youssef Alami — Médecine générale (Cabinet Al Amal, Casablanca) |
| Médecin | `dr.benani@demo.ma` | Dr. Salma Benani — Cardiologie (Clinique Atlas, Rabat) |
| Patient | `ahmed@demo.ma` | Ahmed Berrada — `SH-482913` (plusieurs consultations liées) |
| Patient | `salma@demo.ma` | Salma Idrissi — `SH-731042` (une consultation liée) |

La page de connexion propose un remplissage en un clic pour chaque compte. **Aucun nouveau compte ne peut être créé** : la page d’inscription affiche uniquement la liste des comptes de démonstration.

---

## Parcours de test

### Médecin

1. Connexion avec `dr.alami@demo.ma` → **Nouvelle consultation** ; sélectionnez le patient par son QR/code de démonstration (`SH-482913` Ahmed, `SH-731042` Salma).
2. **Atelier d’enregistrement** : lancez le micro (`MediaRecorder`), mettez en pause/reprise si besoin, puis arrêtez. La transcription en direct utilise la Web Speech API des navigateurs compatibles ; sinon, saisissez le texte manuellement ou utilisez l’endpoint IA optionnel.
3. Générez le rapport (générateur local déterministe par défaut), relisez-le puis **approuvez** explicitement la consultation.
4. **Partagez** : la consultation passe dans le dossier du patient et une notification apparaît chez celui-ci.

### Patient

1. Connexion avec `ahmed@demo.ma` (ou `salma@demo.ma`) → **Mon QR** : le QR/code affiché sert à identifier le patient lors d’une nouvelle consultation. C’est un identifiant de démonstration, **pas une authentification ni un consentement réel**.
2. **Ajouter par code** : saisissez le code de remise fourni par le médecin pour rattacher une consultation à votre historique.
3. Consultez l’historique, les détails, et (selon les écrans) les accès/notifications de la démo.

---

## Persistance et réinitialisation

- Les données de démonstration sont stockées dans le **localStorage du navigateur** sous la clé `Sahty.demo.v1` (avec repli en mémoire si le stockage est indisponible).
- Aucun serveur ne conserve vos modifications : deux navigateurs ont deux états indépendants.
- Pour repartir des données initiales, utilisez **« Réinitialiser la démo »** dans le menu utilisateur, ou supprimez la clé `Sahty.demo.v1` depuis les outils de développement.
- **L’audio n’est pas persisté** : il reste en mémoire pendant la session et disparaît au rechargement. Seuls la transcription et le rapport sont enregistrés.

---

## Configuration

Copiez `.env.example` vers `.env`. Aucune variable n’est obligatoire pour le mode local, mais `NEXTAUTH_SECRET` doit être remplacée par une valeur aléatoire (`openssl rand -base64 32`) hors développement.

| Variable | Rôle |
| --- | --- |
| `NEXTAUTH_URL` | URL publique de l’application (NextAuth) |
| `NEXTAUTH_SECRET` | Secret de signature du JWT NextAuth |
| `NEXT_PUBLIC_APP_URL` | URL publique utilisée côté client |
| `NEXT_PUBLIC_DEMO_AI_SERVER` *(optionnel)* | `true` pour activer les routes IA serveur ; `false` (défaut) garde le rapport local |
| `AI_API_KEY` *(optionnel)* | Clé du fournisseur IA, **côté serveur uniquement** ; jamais exposée au client |

Sans configuration IA, le rapport est produit localement par un générateur déterministe. Les routes optionnelles `/api/ai/transcribe` et `/api/ai/report` nécessitent `AI_API_KEY` et `NEXT_PUBLIC_DEMO_AI_SERVER=true`.

---

## Limites de la démo

- **Pas d’authentification réelle** : identifiants publics figés dans le code, session JWT NextAuth uniquement ; aucun mot de passe haché, aucune inscription, aucune récupération de compte.
- **Pas de consentement ni de QR sécurisés** : les QR codes, codes à 8 caractères, jetons et accès sont des données de démonstration, sans valeur juridique ni garantie de sécurité.
- **Pas de chiffrement ni de contrôle d’accès serveur** : les données sont dans le navigateur de l’utilisateur ; ne saisissez aucune information de santé réelle.
- **Audio en mémoire uniquement** : pas d’enregistrement persistant, pas d’upload de fichiers vers un serveur.
- **Rapport local heuristique** : le générateur déterministe doit toujours être relu et corrigé ; le fournisseur IA externe est optionnel.
- **Transcription en direct dépendante du navigateur** (Web Speech API ; Chrome/Edge recommandés), sinon saisie manuelle.
- **Pas de PostgreSQL, Prisma, migrations ou seed** : plus de `DATABASE_URL`, plus de scripts `db:*`, plus de stockage `uploads/`.
- **Pas d’e-mails, SMS, ni de limitation de débit serveur** ; les notifications sont locales à la démo.

---

## Stack

| Domaine | Choix |
| --- | --- |
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS, composants inspirés de shadcn/ui, Lucide |
| Données | Repository de démo + `localStorage` (aucune base) |
| Authentification | NextAuth (Credentials, JWT) sur comptes figés |
| i18n | next-intl (`ar` / `fr`) |
| Formulaires | react-hook-form + zod |
| Enregistrement / voix | MediaRecorder + Web Speech API |
| QR | `qrcode.react`, `@yudiel/react-qr-scanner` |
| Tests | Vitest |

---

## Scripts et tests

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build Next.js (`next build`) |
| `npm run start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm test` | Tests Vitest |

```bash
npm test
```

---

## CNDP et loi 09-08

Les données de santé sont des données sensibles au sens de la loi 09-08. Avant tout usage réel : déclaration auprès de la **CNDP**, base légale et durée de conservation définies, consentement explicite documenté, chiffrement au repos et en transit, minimisation des accès, droits d’accès/rectification/opposition et analyse d’impact si nécessaire.

Ce dépôt est une démonstration technique : ce n’est ni un dispositif médical ni un service certifié.
