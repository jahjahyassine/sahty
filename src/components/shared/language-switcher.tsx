'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Languages, Check } from 'lucide-react';
import { useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { locales, type AppLocale } from '@/i18n/config';
import { useDemoUserId } from '@/components/shared/demo-session';
import { updateUserProfile } from '@/lib/demo/repository';

const LABELS: Record<AppLocale, string> = { ar: 'العربية', fr: 'Français' };

export function LanguageSwitcher({
  variant = 'default',
  className,
}: {
  variant?: 'default' | 'light' | 'minimal';
  className?: string;
}) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const userId = useDemoUserId();
  const [pending, startTransition] = useTransition();

  function change(next: AppLocale) {
    if (next === locale) return;
    const segments = pathname.split('/');
    segments[1] = next;
    const target = segments.join('/') || `/${next}`;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    if (userId) updateUserProfile(userId, { locale: next });
    startTransition(() => router.push(target));
    router.refresh();
  }

  const light = variant === 'light';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none',
          light
            ? 'bg-white/15 text-white hover:bg-white/25'
            : variant === 'minimal'
              ? 'text-ink-500 hover:bg-primary-50'
              : 'bg-primary-50 text-primary-700 hover:bg-primary-100',
          pending && 'opacity-60',
          className,
        )}
        aria-label="Language"
      >
        <Languages className="h-4 w-4" />
        <span className="uppercase">{locale === 'ar' ? 'AR' : 'FR'}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {locales.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => change(l)} className="justify-between">
            <span>{LABELS[l]}</span>
            {l === locale ? <Check className="h-4 w-4 text-primary-600" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
