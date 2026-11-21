'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { getServerSnapshot, getSnapshot, subscribe } from './repository';
import type { DemoDatabase } from './types';

/** Snapshot réactif de la base de démonstration (source de vérité unique). */
export function useDemoSnapshot(): DemoDatabase {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useDemoSessionUser(userId: string | null | undefined) {
  const db = useDemoSnapshot();
  return useMemo(() => {
    if (!userId) return { user: null, patient: null, doctor: null };
    const user = db.users.find((item) => item.id === userId) ?? null;
    if (!user) return { user: null, patient: null, doctor: null };
    const patient = db.patients.find((item) => item.userId === userId) ?? null;
    const doctor = db.doctors.find((item) => item.userId === userId) ?? null;
    return { user, patient, doctor };
  }, [db, userId]);
}

export function useUnreadCount(userId: string | null | undefined) {
  const db = useDemoSnapshot();
  return useMemo(() => {
    if (!userId) return 0;
    return db.notifications.filter(
      (notification) => notification.userId === userId && !notification.readAt,
    ).length;
  }, [db, userId]);
}

/** Évite d'afficher un état dépendant du navigateur avant l'hydratation. */
export function useDemoReady() {
  const db = useDemoSnapshot();
  return db;
}
