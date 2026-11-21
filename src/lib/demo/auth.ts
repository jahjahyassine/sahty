import { buildFixtures, DEMO_PASSWORD } from './fixtures';
import type { DemoDoctor, DemoPatient, DemoUser } from './types';

/**
 * Authentification de démonstration : comptes statiques, mot de passe en clair.
 * Aucun secret réel, aucun hachage, aucune base de données.
 */
const AUTH_DB = buildFixtures();

export type DemoAuthUser = DemoUser & {
  patient: DemoPatient | null;
  doctor: DemoDoctor | null;
};

function withRelations(user: DemoUser): DemoAuthUser {
  return {
    ...user,
    patient: AUTH_DB.patients.find((patient) => patient.userId === user.id) ?? null,
    doctor: AUTH_DB.doctors.find((doctor) => doctor.userId === user.id) ?? null,
  };
}

export function findDemoAuthUserByEmail(email: string): DemoAuthUser | null {
  const normalized = email.trim().toLowerCase();
  const user = AUTH_DB.users.find((item) => item.email.toLowerCase() === normalized);
  return user ? withRelations(user) : null;
}

export function findDemoAuthUserById(id: string): DemoAuthUser | null {
  const user = AUTH_DB.users.find((item) => item.id === id);
  return user ? withRelations(user) : null;
}

export function verifyDemoCredentials(email: string, password: string): DemoAuthUser | null {
  const user = findDemoAuthUserByEmail(email);
  if (!user) return null;
  if (password !== user.password) return null;
  if (user.password !== DEMO_PASSWORD) return null;
  return user;
}

export function getDemoAccounts() {
  return AUTH_DB.users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    locale: user.locale,
  }));
}
