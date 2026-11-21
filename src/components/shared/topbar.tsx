'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { Logo } from '@/components/shared/logo';
import { NotificationsMenu } from '@/components/shared/notifications-menu';
import { UserMenu } from '@/components/shared/user-menu';
import { SearchPill } from '@/components/ui/search-pill';
import type { ShellUser } from '@/components/shared/sidebar';
import type { Role } from '@/lib/demo/types';

export function Topbar({
  user,
  role,
  unreadCount,
}: {
  user: ShellUser;
  role: Role;
  unreadCount: number;
}) {
  const locale = useLocale();
  const t = useTranslations(role === 'PATIENT' ? 'patient.consultations' : 'doctor.consultations');

  return (
    <header className="flex items-center gap-3 px-1 pb-2 pt-1 sm:px-2">
      <div className="lg:hidden">
        <Logo compact href={`/${locale}/${role === 'PATIENT' ? 'patient' : 'doctor'}`} />
      </div>

      <div className="hidden min-w-0 flex-1 lg:block">
        <SearchPill
          placeholder={t('searchPlaceholder')}
          action={`/${locale}/${role === 'PATIENT' ? 'patient' : 'doctor'}/consultations`}
          className="max-w-[420px]"
        />
      </div>

      <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        <NotificationsMenu userId={user.id} initialUnread={unreadCount} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
