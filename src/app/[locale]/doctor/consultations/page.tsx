import { redirect } from 'next/navigation';
import { unstable_setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { ConsultationsView } from './consultations-view';

export const dynamic = 'force-dynamic';

type SearchParams = {
  query?: string;
  status?: string;
  page?: string;
};

export default async function DoctorConsultationsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: SearchParams;
}) {
  unstable_setRequestLocale(locale);
  const session = await getSessionUser();
  if (session.user.role !== 'DOCTOR') redirect(`/${locale}/patient`);

  return (
    <ConsultationsView
      userId={session.user.id}
      doctorId={session.user.doctor?.id ?? ''}
      query={typeof searchParams.query === 'string' ? searchParams.query : ''}
      status={typeof searchParams.status === 'string' ? searchParams.status : ''}
      page={typeof searchParams.page === 'string' ? searchParams.page : '1'}
    />
  );
}
