'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useDemoSessionUser } from '@/lib/demo/use-demo';
import { formatDate } from '@/lib/utils';
import { DoctorProfileForm } from './profile-form';

export function ProfileView({ userId, doctorId }: { userId: string; doctorId: string }) {
  const t = useTranslations('doctor.profile');
  const tc = useTranslations('common');
  const about = useTranslations('about');
  const locale = useLocale();
  const { user, doctor: sessionDoctor } = useDemoSessionUser(userId);
  const doctor = sessionDoctor;

  if (!user || !doctor) {
    return (
      <div className="animate-fade-up">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <div className="rounded-3xl bg-white p-8 text-center text-sm text-ink-500 ring-1 ring-line/70">
          {tc('noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-accent-400 via-accent-500 to-primary-600 p-6 text-white shadow-soft">
            <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
            <span className="pointer-events-none absolute -bottom-24 -left-14 h-52 w-52 rounded-full bg-primary-300/20 blur-2xl" />

            <div className="relative flex flex-col items-center text-center">
              <Avatar
                name={user.fullName}
                src={user.avatarUrl}
                size="2xl"
                tone="soft"
                className="ring-4 ring-white/20"
              />
              <h2 className="mt-4 text-xl font-bold">{user.fullName}</h2>
              <p className="mt-1 text-[11px] font-medium text-white/70">{user.email}</p>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold">
                  {t('roleDoctor')}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold">
                  {doctor.specialty}
                </span>
              </div>

              <div className="mt-5 w-full rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  {t('licenseNumber')}
                </p>
                <p className="ltr-code mt-1 text-lg font-bold tracking-[0.12em]">
                  {doctor.licenseNumber ?? tc('notProvided')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
            <p className="text-sm font-bold">{t('accountInfo')}</p>
            <div className="mt-3 space-y-3 text-[11px]">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary-500">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-ink-400">{t('email')}</p>
                  <p className="truncate font-semibold text-ink-900">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary-500">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-ink-400">{t('phone')}</p>
                  <p className="truncate font-semibold text-ink-900">{user.phone ?? tc('notProvided')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary-500">
                  <Building2 className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-ink-400">{t('clinicName')}</p>
                  <p className="truncate font-semibold text-ink-900">
                    {doctor.clinicName ?? tc('notProvided')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary-500">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-ink-400">{t('city')}</p>
                  <p className="truncate font-semibold text-ink-900">{doctor.city ?? tc('notProvided')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-ink-400">{t('memberSinceLabel')}</p>
                  <p className="truncate font-semibold text-ink-900">
                    {formatDate(user.createdAt, locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-primary-100/60 p-4 ring-1 ring-primary-100">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <div>
                <p className="text-[11px] font-bold text-primary-800">{about('privacyTitle')}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-primary-900/60">{about('privacyBody')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 lg:col-span-8">
          <DoctorProfileForm userId={userId} doctorId={doctorId} />

          <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <p className="text-sm font-bold">{t('security')}</p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{t('securityBody')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="green">
                <BadgeCheck className="h-3 w-3" />
                HTTPS
              </Badge>
              <Badge variant="violet">
                <Stethoscope className="h-3 w-3" />
                {t('roleDoctor')}
              </Badge>
              <Badge variant="gray">CNDP</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
