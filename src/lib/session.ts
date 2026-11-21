import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { findDemoAuthUserById } from '@/lib/demo/auth';

/**
 * Session serveur : utilisateur statique de démonstration.
 * Les données métier (consultations, notifications, profil) vivent dans le
 * repository navigateur ; les layouts ne transmettent que l'identité.
 */
export const getSessionUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = findDemoAuthUserById(session.user.id);
  if (!user) redirect('/login');

  return { user, unread: 0 };
});
