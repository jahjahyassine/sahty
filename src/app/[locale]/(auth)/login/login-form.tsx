'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn, getSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  Info,
  Loader2,
  LockKeyhole,
  Mail,
  QrCode,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { DEMO_ACCOUNTS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (!result || result.error) {
        toast.error(t('invalidCredentials'));
        setPending(false);
        return;
      }
      const session = await getSession();
      const isDoctor = session?.user?.role === 'DOCTOR';
      const fallback = `/${locale}/${isDoctor ? 'doctor' : 'patient'}`;
      const next = searchParams.get('next');
      const target = next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
      toast.success(t('welcomeBack'));
      router.replace(target);
      router.refresh();
    } catch {
      toast.error(tc('networkError'));
      setPending(false);
    }
  }

  function fillAccount(email: string) {
    setValue('email', email, { shouldValidate: true });
    setValue('password', DEMO_ACCOUNTS.password, { shouldValidate: true });
  }

  function fillDemo(kind: 'patient' | 'doctor') {
    fillAccount(kind === 'patient' ? DEMO_ACCOUNTS.patient : DEMO_ACCOUNTS.doctor);
  }

  const demoLogins = [
    { email: DEMO_ACCOUNTS.doctor, role: 'doctor' as const, icon: Stethoscope, fill: () => fillDemo('doctor') },
    {
      email: 'dr.benani@demo.ma',
      role: 'doctor' as const,
      icon: Stethoscope,
      fill: () => fillAccount('dr.benani@demo.ma'),
    },
    { email: DEMO_ACCOUNTS.patient, role: 'patient' as const, icon: UserRound, fill: () => fillDemo('patient') },
    {
      email: 'salma@demo.ma',
      role: 'patient' as const,
      icon: UserRound,
      fill: () => fillAccount('salma@demo.ma'),
    },
  ];

  return (
    <div className="grid overflow-hidden rounded-[36px] bg-white shadow-card ring-1 ring-white/60 lg:grid-cols-[1.02fr_1fr]">
      {/* Panneau marque */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 p-8 text-white lg:flex lg:flex-col">
        <span className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-accent-400/20 blur-2xl" />
        <span className="pointer-events-none absolute right-10 top-1/3 h-24 w-24 rounded-full border border-white/15" />

        <Logo variant="light" href={`/${locale}/login`} />

        <div className="relative mt-14 max-w-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
            <Sparkles className="h-3 w-3 text-accent-300" />
            {t('welcome')}
          </span>
          <h1 className="mt-5 text-[34px] font-bold leading-[1.15] tracking-tight">
            {t('joinTitle')}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">{t('joinBody')}</p>
        </div>

        <div className="relative mt-8 space-y-3">
          {[
            { icon: QrCode, text: locale === 'ar' ? 'ربط الاستشارة بمسح رمز QR' : 'Liez une consultation en scannant un QR' },
            { icon: Info, text: locale === 'ar' ? 'مساحة تجريبية بدون بيانات حقيقية' : 'Espace de démonstration, sans données réelles' },
            { icon: HeartPulse, text: locale === 'ar' ? 'تاريخك الطبي في مكان واحد' : 'Votre historique médical au même endroit' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-xs font-medium text-white/85">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/12">
                <item.icon className="h-4 w-4" />
              </span>
              {item.text}
            </div>
          ))}
        </div>

        <div className="relative mt-auto pt-8">
          <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-md ring-1 ring-white/15">
            <div className="flex items-center gap-3">
              <Avatar name="Ahmed Berrada" size="sm" tone="peach" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">Ahmed Berrada</p>
                <p className="text-[10px] text-white/60">SH-482913</p>
              </div>
              <span className="rounded-full bg-[#3E8E75] px-2 py-1 text-[9px] font-semibold text-white">
                ✓ {locale === 'ar' ? 'مرتبط' : 'Liée'}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-3 py-2.5 text-ink-900">
              <div>
                <p className="text-[10px] font-semibold text-ink-400">
                  {locale === 'ar' ? 'آخر استشارة' : 'Dernière consultation'}
                </p>
                <p className="text-[11px] font-bold">Dr. Youssef Alami</p>
              </div>
              <LogoMark className="h-8 w-8 rounded-lg shadow-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex flex-col p-6 sm:p-9 lg:p-10">
        <div className="mb-7 flex items-center justify-between lg:hidden">
          <Logo href={`/${locale}/login`} />
        </div>

        <div className="mx-auto w-full max-w-sm">
          <p className="eyebrow text-primary-500">{t('loginTitle')}</p>
          <h2 className="mt-2 text-[28px] font-bold tracking-tight">{t('welcomeBack')}</h2>
          <p className="mt-2 text-sm text-ink-500">{t('loginSubtitle')}</p>

          <div className="mt-5 rounded-2xl bg-primary-50/70 p-3.5 ring-1 ring-primary-100/60">
            <p className="flex items-center gap-2 text-[11px] font-bold text-primary-800">
              <Info className="h-3.5 w-3.5 shrink-0 text-primary-500" />
              {t('demoOnlyTitle')}
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-ink-500">{t('demoOnlyBody')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div>
              <Label htmlFor="email">{t('email')}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  className="ps-11"
                  {...register('email')}
                />
              </div>
              <FieldError>{errors.email ? t('invalidCredentials') : undefined}</FieldError>
            </div>

            <div>
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="ps-11 pe-11"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink-400 hover:bg-primary-50 hover:text-primary-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError>{errors.password ? t('invalidCredentials') : undefined}</FieldError>
            </div>

            <Button type="submit" variant="primary" size="lg" className="mt-2 w-full" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('loggingIn')}
                </>
              ) : (
                <>
                  {t('loginCta')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl bg-white p-3.5 shadow-soft ring-1 ring-line">
            <p className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold text-ink-500">
              <Sparkles className="h-3.5 w-3.5 text-accent-500" />
              {t('demoAccounts')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoLogins.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={account.fill}
                  title={account.email}
                  className="flex items-center gap-2 rounded-xl bg-primary-50/40 px-2.5 py-2 text-start ring-1 ring-line transition-colors hover:bg-primary-50"
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg',
                      account.role === 'doctor'
                        ? 'bg-accent-100 text-accent-500'
                        : 'bg-primary-100 text-primary-600',
                    )}
                  >
                    <account.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold text-ink-700">
                      {account.role === 'doctor' ? t('demoDoctor') : t('demoPatient')}
                    </span>
                    <span className="block truncate text-[9px] font-normal text-ink-400" dir="ltr">
                      {account.email}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-ink-400">{t('demoHint')}</p>
          </div>

          <p className="mt-6 text-center text-sm text-ink-500">
            {t('noAccount')}{' '}
            <Link href={`/${locale}/register`} className="font-semibold text-primary-600 hover:text-primary-800">
              {t('createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
