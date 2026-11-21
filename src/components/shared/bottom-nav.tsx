'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ClipboardList,
  FolderOpen,
  Home,
  QrCode,
  ShieldCheck,
  UserRound,
  Plus,
} from 'lucide-react';
import type { Role } from '@/lib/demo/types';
import { cn } from '@/lib/utils';

export function BottomNav({ role }: { role: Role }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const isPatient = role === 'PATIENT';

  const items = isPatient
    ? [
        { href: `/${locale}/patient`, label: t('home'), icon: Home, exact: true },
        { href: `/${locale}/patient/consultations`, label: t('consultations'), icon: ClipboardList },
        { href: `/${locale}/patient/access`, label: t('access'), icon: ShieldCheck },
        { href: `/${locale}/patient/profile`, label: t('profile'), icon: UserRound },
      ]
    : [
        { href: `/${locale}/doctor`, label: t('home'), icon: Home, exact: true },
        { href: `/${locale}/doctor/consultations`, label: t('consultations'), icon: ClipboardList },
        { href: `/${locale}/doctor/patients`, label: t('patients'), icon: FolderOpen },
        { href: `/${locale}/doctor/profile`, label: t('profile'), icon: UserRound },
      ];

  const fabHref = isPatient ? `/${locale}/patient/qr` : `/${locale}/doctor/consultations/new`;
  const FabIcon = isPatient ? QrCode : Plus;

  function active(href: string, exact?: boolean) {
    const clean = href.split('?')[0];
    if (exact) return pathname === clean;
    return pathname === clean || pathname.startsWith(`${clean}/`);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="glass-nav relative mx-auto flex max-w-lg items-center justify-around rounded-[26px] px-2 py-2 ring-1 ring-white/70">
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.href} {...item} active={active(item.href, item.exact)} />
        ))}

        <Link
          href={fabHref}
          aria-label={isPatient ? t('qr') : t('newConsultation')}
          className="relative -mt-7 grid h-[58px] w-[58px] shrink-0 place-items-center rounded-[22px] bg-primary-600 text-white shadow-lift ring-4 ring-white transition-transform hover:-translate-y-1"
        >
          <span className="absolute inset-0 animate-pulse-ring rounded-[22px] bg-primary-400/40" />
          <FabIcon className="relative h-6 w-6" />
        </Link>

        {items.slice(2).map((item) => (
          <NavItem key={item.href} {...item} active={active(item.href, item.exact)} />
        ))}
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex w-[68px] flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-colors',
        active ? 'text-primary-700' : 'text-ink-400 hover:text-primary-600',
      )}
    >
      <span className={cn('grid h-8 w-8 place-items-center rounded-xl', active ? 'bg-primary-100' : '')}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
