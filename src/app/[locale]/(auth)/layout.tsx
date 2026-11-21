import { unstable_setRequestLocale } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/shared/language-switcher';

export default function AuthLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6">
      <div className="absolute end-4 top-4 z-10 sm:end-8 sm:top-8">
        <LanguageSwitcher />
      </div>

      <div className="pointer-events-none absolute left-[8%] top-[18%] hidden h-32 w-32 rounded-full bg-primary-200/40 blur-2xl lg:block" />
      <div className="pointer-events-none absolute bottom-[12%] right-[10%] hidden h-40 w-40 rounded-full bg-accent-200/40 blur-3xl lg:block" />

      {children}

      <p className="relative mt-5 text-[11px] font-medium text-ink-400">
        صحتي · Sahty — Tous droits réservés
      </p>
    </div>
  );
}
