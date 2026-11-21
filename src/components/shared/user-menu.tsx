'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronDown, LogOut, UserRound, QrCode, RotateCcw, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resetDemoData } from '@/lib/demo/repository';
import type { Role } from '@/lib/demo/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import type { ShellUser } from '@/components/shared/sidebar';

export function UserMenu({ user }: { user: ShellUser }) {
  const locale = useLocale();
  const t = useTranslations('common');
  const isPatient = user.role === 'PATIENT';
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex h-11 items-center gap-2 rounded-full bg-ink-900 py-1 pe-2.5 ps-1 text-white shadow-pill outline-none transition-transform hover:-translate-y-0.5">
        <Avatar
          name={user.fullName}
          src={user.avatarUrl}
          size="sm"
          tone={isPatient ? 'violet' : 'peach'}
          className="ring-2 ring-white/20"
        />
        <span className="hidden max-w-[130px] truncate text-xs font-semibold sm:block">
          {user.fullName}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-white/60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{isPatient ? t('profile') : t('profile')}</DropdownMenuLabel>
        <div className="mb-1 flex items-center gap-3 rounded-2xl bg-primary-50/70 p-2.5">
          <Avatar name={user.fullName} size="sm" tone={isPatient ? 'violet' : 'peach'} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-ink-900">{user.fullName}</p>
            <p className="truncate text-[10px] text-ink-400">{user.email}</p>
          </div>
        </div>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/${isPatient ? 'patient' : 'doctor'}/profile`}>
            <UserRound className="h-4 w-4" />
            {t('profile')}
          </Link>
        </DropdownMenuItem>
        {isPatient ? (
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/patient/qr`}>
              <QrCode className="h-4 w-4" />
              {t('qrCode')}
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/doctor/consultations/new`}>
              <Stethoscope className="h-4 w-4" />
              {t('doctor')}
            </Link>
          </DropdownMenuItem>
        )}
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-xs text-ink-400">{t('language')}</span>
          <LanguageSwitcher />
        </div>
        <DropdownMenuSeparator />
        {confirmReset ? (
          <div className="px-2 py-2">
            <p className="text-xs font-bold text-ink-900">{t('resetDemoTitle')}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-500">
              {t('resetDemoBody')}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => {
                  resetDemoData();
                  setConfirmReset(false);
                  toast.success(t('resetDemoDone'));
                }}
              >
                {t('confirm')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setConfirmReset(false)}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setConfirmReset(true);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            {t('resetDemo')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:bg-[#FDECEC] focus:text-danger"
          onSelect={() => signOut({ callbackUrl: `/${locale}/login` })}
        >
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
