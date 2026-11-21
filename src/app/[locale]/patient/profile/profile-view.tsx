'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  CalendarDays,
  Mail,
  Phone,
  QrCode,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useDemoSessionUser } from '@/lib/demo/use-demo';
import { PageHeader } from '@/components/shared/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import { MedicalInfoForm } from './medical-form';
import { EditProfileDialog } from './edit-profile-dialog';

export function PatientProfileView(props: {
  userId: string;
  patientId: string;
}) {
  const { userId, patientId } = props;
  const { user, patient } = useDemoSessionUser(userId);
  const locale = useLocale();
  const t = useTranslations('patient.profile');
  const tc = useTranslations('common');
  const about = useTranslations('about');

  if (!user || !patient) {
    return (
      <div className="animate-fade-up">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <EmptyState icon={<UserRound />} title={t('title')} body={tc('error')} />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          {/* Carte profil violette */}
          <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 p-6 text-white shadow-soft">
            <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
            <span className="pointer-events-none absolute -bottom-24 -left-14 h-52 w-52 rounded-full bg-accent-400/15 blur-2xl" />

            <div className="relative flex flex-col items-center text-center">
              <Avatar
                name={user.fullName}
                src={user.avatarUrl}
                size="2xl"
                tone="soft"
                className="ring-4 ring-white/20"
              />
              <h2 className="mt-4 text-xl font-bold">{user.fullName}</h2>
              <p className="mt-1 text-[11px] font-medium text-white/60">{user.email}</p>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold">
                  {t('rolePatient')}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold">
                  {t('memberSince', { date: formatDate(user.createdAt, locale, { month: 'short', year: 'numeric' }) })}
                </span>
              </div>

              <div className="mt-5 w-full rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  {t('patientCode')}
                </p>
                <p className="ltr-code mt-1 text-lg font-bold tracking-[0.12em]">{patient.patientCode}</p>
              </div>

              <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
                <Link
                  href={`/${locale}/patient/qr`}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-primary-700 shadow-soft transition-colors hover:bg-primary-50"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {tc('qrCode')}
                </Link>
                <EditProfileDialog userId={user.id} />
              </div>
            </div>
          </div>

          {/* Informations du compte */}
          <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
            <p className="text-sm font-bold">{t('accountInfo')}</p>
            <div className="mt-3 space-y-3 text-[11px]">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary-500">
                  <UserRound className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-ink-400">{t('fullName')}</p>
                  <p className="truncate font-semibold text-ink-900">{user.fullName}</p>
                </div>
              </div>
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

          <div className="flex items-start gap-2.5 rounded-2xl bg-white/70 p-3.5 ring-1 ring-line/60">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p className="text-[10px] leading-relaxed text-ink-500">{t('demoNote')}</p>
          </div>
        </div>

        <div className="space-y-3 lg:col-span-8">
          <MedicalInfoForm patientId={patientId} />

          <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <p className="text-sm font-bold">{t('security')}</p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{t('securityBody')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="green">HTTPS</Badge>
              <Badge variant="violet">{tc('privacy')}</Badge>
              <Badge variant="gray">CNDP</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
