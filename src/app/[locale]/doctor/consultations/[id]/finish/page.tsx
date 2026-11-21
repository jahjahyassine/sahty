import { redirect } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { ApprovalFlow } from './approval-flow';

export const dynamic = 'force-dynamic';

export default async function FinishConsultationPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const data = await getSessionUser();
  if (!data) redirect(`/${locale}/login`);
  if (data.user.role !== 'DOCTOR') redirect(`/${locale}/patient`);
  if (!data.user.doctor) redirect(`/${locale}/doctor`);

  return <ApprovalFlow consultationId={id} doctorId={data.user.doctor.id} />;
}
