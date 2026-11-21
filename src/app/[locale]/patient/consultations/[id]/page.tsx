import { redirect } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { PatientConsultationDetailView } from './consultation-detail-view';

export const dynamic = 'force-dynamic';

export default async function PatientConsultationDetail({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const data = await getSessionUser();
  if (data.user.role !== 'PATIENT') redirect(`/${locale}/doctor`);

  return (
    <PatientConsultationDetailView
      userId={data.user.id}
      patientId={data.user.patient?.id ?? ''}
      consultationId={id}
    />
  );
}
