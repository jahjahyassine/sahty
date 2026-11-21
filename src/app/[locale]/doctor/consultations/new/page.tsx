import { redirect } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { NewConsultationView } from './new-consultation-view';

export const dynamic = 'force-dynamic';

type Props = {
  params: { locale: string };
  searchParams?: { patientId?: string; patientName?: string };
};

export default async function NewConsultationPage({
  params: { locale },
  searchParams,
}: Props) {
  unstable_setRequestLocale(locale);
  const session = await getSessionUser();
  if (session.user.role !== 'DOCTOR') redirect(`/${locale}/patient`);

  return (
    <NewConsultationView
      userId={session.user.id}
      doctorId={session.user.doctor?.id ?? ''}
      patientId={searchParams?.patientId?.trim() ?? ''}
      patientName={searchParams?.patientName?.trim() ?? ''}
    />
  );
}
