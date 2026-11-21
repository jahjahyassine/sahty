import { redirect } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { PatientsView } from './patients-view';

export const dynamic = 'force-dynamic';

export default async function DoctorPatientsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSessionUser();
  if (session.user.role !== 'DOCTOR') redirect(`/${locale}/patient`);

  return <PatientsView userId={session.user.id} doctorId={session.user.doctor?.id ?? ''} />;
}
