import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import type { Role } from '@/lib/demo/types';
import { verifyDemoCredentials } from '@/lib/demo/auth';
import { DEMO_AUTH_SECRET } from '@/lib/demo/config';

/**
 * Authentification de démonstration.
 *
 * Les comptes proviennent de `src/lib/demo/fixtures.ts` et le mot de passe est
 * volontairement public (`Demo1234!`). Aucune base de données, aucun bcrypt.
 * La session reste un JWT NextAuth pour conserver les guards existants.
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30,
  },
  pages: {
    signIn: '/ar/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = verifyDemoCredentials(credentials.email, credentials.password);
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          image: user.avatarUrl,
          role: user.role,
          locale: user.locale,
          patientId: user.patient?.id ?? null,
          doctorId: user.doctor?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role: Role }).role;
        token.patientId = (user as { patientId?: string | null }).patientId ?? null;
        token.doctorId = (user as { doctorId?: string | null }).doctorId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? token.sub ?? '';
        session.user.role = token.role as Role;
        session.user.patientId = (token.patientId as string | null) ?? null;
        session.user.doctorId = (token.doctorId as string | null) ?? null;
      }
      return session;
    },
  },
  secret: DEMO_AUTH_SECRET,
};

export function auth() {
  return getServerSession(authOptions);
}
