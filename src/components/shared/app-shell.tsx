'use client';

import { useLocale } from 'next-intl';
import { BottomNav } from '@/components/shared/bottom-nav';
import { DemoSessionProvider } from '@/components/shared/demo-session';
import { Sidebar, type ShellUser } from '@/components/shared/sidebar';
import { Topbar } from '@/components/shared/topbar';
import type { Role } from '@/lib/demo/types';
import { useDemoSessionUser, useUnreadCount } from '@/lib/demo/use-demo';

export type AppShellSessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  patientId: string | null;
  doctorId: string | null;
  avatarUrl: string | null;
};

/**
 * Coquille applicative : l'identité vient du JWT serveur, mais le nom, le
 * profil et le compteur de notifications sont relus dans le repository
 * navigateur pour rester cohérents avec les modifications de démonstration.
 */
export function AppShell({
  sessionUser,
  children,
}: {
  sessionUser: AppShellSessionUser;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const { user, patient, doctor } = useDemoSessionUser(sessionUser.id);
  const unread = useUnreadCount(sessionUser.id);

  const liveUser: ShellUser = {
    id: sessionUser.id,
    fullName: user?.fullName ?? sessionUser.fullName,
    email: user?.email ?? sessionUser.email,
    role: sessionUser.role,
    patientCode: patient?.patientCode,
    specialty: doctor?.specialty,
    avatarUrl: user?.avatarUrl ?? sessionUser.avatarUrl,
  };

  return (
    <DemoSessionProvider userId={sessionUser.id}>
      <div className="min-h-screen p-2.5 sm:p-4 lg:p-5">
        <div className="app-shell min-h-[calc(100vh-1.25rem)] flex-row gap-4 p-2.5 sm:p-3 lg:min-h-[calc(100vh-2.5rem)] lg:p-4">
          <Sidebar user={liveUser} locale={locale} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar user={liveUser} role={sessionUser.role} unreadCount={unread} />
            <main className="flex-1 px-0.5 pb-28 pt-2 sm:px-1 lg:pb-2">{children}</main>
          </div>
        </div>
        <BottomNav role={sessionUser.role} />
      </div>
    </DemoSessionProvider>
  );
}
