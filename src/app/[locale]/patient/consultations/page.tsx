import { redirect } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { PatientConsultationsView } from './patient-consultations-view';

export const dynamic = 'force-dynamic';

export default async function PatientConsultationsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const data = await getSessionUser();
  if (data.user.role !== 'PATIENT') redirect(`/${locale}/doctor`);

  return (
    <PatientConsultationsView
      userId={data.user.id}
      patientId={data.user.patient?.id ?? ''}
    />
  );
}
