import { redirect } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { ConsultationWorkspace } from '@/components/doctor/consultation-workspace';

export const dynamic = 'force-dynamic';

export default async function DoctorConsultationWorkspacePage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const data = await getSessionUser();
  if (!data) redirect(`/${locale}/login`);
  if (data.user.role !== 'DOCTOR') redirect(`/${locale}/patient`);
  if (!data.user.doctor) redirect(`/${locale}/doctor`);

  return <ConsultationWorkspace consultationId={id} doctorId={data.user.doctor.id} />;
}
