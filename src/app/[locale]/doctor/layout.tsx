import { redirect } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { AppShell } from '@/components/shared/app-shell';

export default async function DoctorLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const data = await getSessionUser();
  if (!data) redirect(`/${locale}/login`);
  if (data.user.role !== 'DOCTOR') redirect(`/${locale}/patient`);

  return (
    <AppShell
      sessionUser={{
        id: data.user.id,
        fullName: data.user.fullName,
        email: data.user.email,
        role: data.user.role,
        patientId: data.user.patient?.id ?? null,
        doctorId: data.user.doctor?.id ?? null,
        avatarUrl: data.user.avatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}
