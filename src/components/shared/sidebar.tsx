'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  CalendarPlus,
  ClipboardList,
  FolderOpen,
  Home,
  QrCode,
  ScanLine,
  ShieldCheck,
  UserRound,
  Stethoscope,
  Clock3,
  ArrowUpRight,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/demo/types';

export type ShellUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  patientCode?: string | null;
  specialty?: string | null;
  avatarUrl?: string | null;
};

export function Sidebar({
  user,
  locale,
  className,
}: {
  user: ShellUser;
  locale: string;
  className?: string;
}) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tp = useTranslations('patient.dashboard');
  const td = useTranslations('doctor.dashboard');
  const isPatient = user.role === 'PATIENT';

  const items = isPatient
    ? [
        { href: `/${locale}/patient`, label: t('home'), icon: Home, exact: true },
        { href: `/${locale}/patient/consultations`, label: t('consultations'), icon: ClipboardList },
        { href: `/${locale}/patient/qr`, label: t('qr'), icon: QrCode },
        { href: `/${locale}/patient/claim`, label: t('claim'), icon: ScanLine },
        { href: `/${locale}/patient/access`, label: t('access'), icon: ShieldCheck },
        { href: `/${locale}/patient/profile`, label: t('profile'), icon: UserRound },
      ]
    : [
        { href: `/${locale}/doctor`, label: t('home'), icon: Home, exact: true },
        { href: `/${locale}/doctor/consultations/new`, label: t('newConsultation'), icon: CalendarPlus },
        { href: `/${locale}/doctor/consultations`, label: t('consultations'), icon: ClipboardList, exact: true },
        { href: `/${locale}/doctor/patients`, label: t('patients'), icon: FolderOpen },
        { href: `/${locale}/doctor/profile`, label: t('profile'), icon: UserRound },
      ];

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={cn(
        'sticky top-4 hidden h-[calc(100vh-2rem)] w-[248px] shrink-0 flex-col rounded-[26px] bg-primary-50/80 p-4 ring-1 ring-primary-100/50 lg:flex',
        className,
      )}
    >
      <div className="px-1 pt-1">
        <Logo href={`/${locale}/${isPatient ? 'patient' : 'doctor'}`} />
      </div>

      <nav className="mt-7 flex flex-col gap-1.5">
        <p className="eyebrow mb-2 px-3">{locale === 'ar' ? 'القائمة' : 'Menu'}</p>
        {items.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200',
                active
                  ? 'bg-primary-600 text-white shadow-soft'
                  : 'text-ink-500 hover:bg-white/80 hover:text-primary-700',
              )}
            >
              <span
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-xl transition-colors',
                  active ? 'bg-white/15 text-white' : 'bg-white text-primary-500 group-hover:bg-primary-100',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{item.label}</span>
              {active ? <span className="ms-auto h-1.5 w-1.5 rounded-full bg-accent-300" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-4">
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl p-4 text-white shadow-soft',
            isPatient ? 'bg-primary-600' : 'bg-accent-500',
          )}
        >
          <span className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-white/15" />
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/15">
            {isPatient ? <QrCode className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
          </span>
          <p className="relative mt-3 text-sm font-bold leading-snug">
            {isPatient ? tp('qrTitle') : td('newConsultation')}
          </p>
          <p className="relative mt-1 text-[11px] leading-relaxed text-white/70">
            {isPatient ? tp('qrBody') : td('linkHint')}
          </p>
          <Link
            href={isPatient ? `/${locale}/patient/qr` : `/${locale}/doctor/consultations/new`}
            className="relative mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white underline-offset-4 hover:underline"
          >
            {isPatient ? tp('openQr') : td('newConsultation')}
            <ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" />
          </Link>
        </div>

        <div className="flex items-center gap-3 rounded-3xl bg-white p-3 ring-1 ring-line/70">
          <Avatar name={user.fullName} src={user.avatarUrl} size="sm" tone={isPatient ? 'violet' : 'peach'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink-900">{user.fullName}</p>
            <p className="truncate text-[10px] text-ink-400">
              {isPatient ? user.patientCode : user.specialty}
            </p>
          </div>
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-ink-300" />
        </div>
      </div>
    </aside>
  );
}
