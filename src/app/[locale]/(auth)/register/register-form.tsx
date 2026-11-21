'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Info, LockKeyhole, Stethoscope, UserRound } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { DEMO_ACCOUNTS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const DEMO_LOGINS = [
  { email: DEMO_ACCOUNTS.doctor, role: 'doctor' as const },
  { email: 'dr.benani@demo.ma', role: 'doctor' as const },
  { email: DEMO_ACCOUNTS.patient, role: 'patient' as const },
  { email: 'salma@demo.ma', role: 'patient' as const },
];

export function RegisterForm() {
  const t = useTranslations('auth');
  const locale = useLocale();

  return (
    <div className="overflow-hidden rounded-[36px] bg-white shadow-card ring-1 ring-white/60">
      <div className="border-b border-line px-6 py-5 sm:px-8">
        <Logo href={`/${locale}/login`} />
      </div>

      <div className="mx-auto max-w-xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-3xl bg-primary-50/70 p-5 ring-1 ring-primary-100/60">
          <p className="flex items-center gap-2 text-xs font-bold text-primary-800">
            <Info className="h-4 w-4 shrink-0 text-primary-500" />
            {t('demoOnlyTitle')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{t('demoOnlyBody')}</p>
        </div>

        <div className="mt-8">
          <p className="eyebrow text-primary-500">{t('demoAccounts')}</p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {DEMO_LOGINS.map((account) => (
              <div
                key={account.email}
                className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-line"
              >
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                    account.role === 'doctor'
                      ? 'bg-accent-100 text-accent-500'
                      : 'bg-primary-100 text-primary-600',
                  )}
                >
                  {account.role === 'doctor' ? (
                    <Stethoscope className="h-4 w-4" />
                  ) : (
                    <UserRound className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-ink-700">
                    {account.role === 'doctor' ? t('demoDoctor') : t('demoPatient')}
                  </span>
                  <span className="block truncate text-[11px] text-ink-500" dir="ltr">
                    {account.email}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-[11px] text-ink-400">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
            {t('demoHint')}
          </p>
        </div>

        <Link
          href={`/${locale}/login`}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  );
}
