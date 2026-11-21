import type { Role } from '@/lib/demo/types';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      patientId: string | null;
      doctorId: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role: Role;
    locale?: string;
    patientId?: string | null;
    doctorId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    role?: Role;
    patientId?: string | null;
    doctorId?: string | null;
  }
}
