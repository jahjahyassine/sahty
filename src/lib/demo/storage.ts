import { buildFixtures, DEMO_DB_VERSION } from './fixtures';
import type { DemoDatabase } from './types';

/**
 * Persistance de démonstration.
 *
 * La base de démonstration vit dans le navigateur (`localStorage`). En cas
 * d'indisponibilité (mode privé, quota, SSR), un repli mémoire conserve les
 * données le temps de la session. Aucun composant ne doit lire `localStorage`
 * directement : tout passe par `demoRepository`.
 */
export const DEMO_STORAGE_KEY = 'Sahty.demo.v1';

let memoryValue: string | null = null;

function canUseStorage() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readRaw(): string | null {
  if (!canUseStorage()) return memoryValue;
  try {
    return window.localStorage.getItem(DEMO_STORAGE_KEY);
  } catch {
    return memoryValue;
  }
}

function writeRaw(value: string) {
  memoryValue = value;
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, value);
  } catch {
    // Quota ou mode privé : le repli mémoire reste cohérent.
  }
}

function removeRaw() {
  memoryValue = null;
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
  } catch {
    // ignoré
  }
}

function isDatabase(value: unknown): value is DemoDatabase {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DemoDatabase>;
  return (
    candidate.version === DEMO_DB_VERSION &&
    Array.isArray(candidate.users) &&
    Array.isArray(candidate.patients) &&
    Array.isArray(candidate.doctors) &&
    Array.isArray(candidate.consultations) &&
    Array.isArray(candidate.accessGrants) &&
    Array.isArray(candidate.notifications) &&
    Array.isArray(candidate.auditLogs)
  );
}

/** Charge la base persistée, ou construit les fixtures déterministes. */
export function loadDemoDatabase(): DemoDatabase {
  const raw = readRaw();
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isDatabase(parsed)) return parsed;
    } catch {
      // Donnée corrompue : on repart des fixtures.
    }
  }
  const fixtures = buildFixtures();
  saveDemoDatabase(fixtures);
  return fixtures;
}

export function saveDemoDatabase(db: DemoDatabase) {
  writeRaw(JSON.stringify(db));
}

export function clearDemoStorage() {
  removeRaw();
}

export function getStorageStatus() {
  return {
    key: DEMO_STORAGE_KEY,
    persistent: canUseStorage(),
  };
}
