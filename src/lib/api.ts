/**
 * Erreur applicative partagée par les helpers serveur restants (next-auth,
 * providers IA). Le reste de l'application démo utilise directement le
 * repository navigateur et n'appelle plus d'API de données.
 */
export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 400, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}
