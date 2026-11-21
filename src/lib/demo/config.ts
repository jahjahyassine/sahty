/**
 * Configuration partagée de la démo. Ce secret n'a aucune valeur de sécurité :
 * il signe uniquement les sessions locales de démonstration.
 */
export const DEMO_AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? 'sehhati-demo-only-secret-change-me';
