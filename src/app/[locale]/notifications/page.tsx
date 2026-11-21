import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { PageHeader } from '@/components/shared/page-header';
import { NotificationsList } from '@/components/shared/notifications-list';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'notifications' });
  return { title: t('title') };
}

export default async function NotificationsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'notifications' });
  const data = await getSessionUser();

  return (
    <div className="animate-fade-up">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <NotificationsList userId={data!.user.id} />
    </div>
  );
}
