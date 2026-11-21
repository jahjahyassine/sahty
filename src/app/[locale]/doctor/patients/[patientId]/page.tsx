import { redirect } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { DossierView } from './dossier-view';

export const dynamic = 'force-dynamic';

export default async function DossierPatientPage({
  params: { locale, patientId },
}: {
  params: { locale: string; patientId: string };
}) {
  unstable_setRequestLocale(locale);
  const session = await getSessionUser();
  if (session.user.role !== 'DOCTOR') redirect(`/${locale}/patient`);

  return (
    <DossierView
      userId={session.user.id}
      doctorId={session.user.doctor?.id ?? ''}
      patientId={patientId}
    />
  );
}
