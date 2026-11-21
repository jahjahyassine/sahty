'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Eye,
  FolderOpen,
  HeartPulse,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { getPatientDashboard } from '@/lib/demo/repository';
import { useDemoSessionUser, useDemoSnapshot } from '@/lib/demo/use-demo';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, HighlightCard, MiniStatCard } from '@/components/shared/stat-card';
import { ConsultationCard } from '@/components/shared/consultation-card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBubble } from '@/components/ui/icon-bubble';
import { Badge } from '@/components/ui/badge';
import { formatDate, firstName } from '@/lib/utils';

const BUBBLE_COLORS = ['rose', 'peach', 'sky', 'violet', 'mint'] as const;
const DEFAULT_SPECIALTIES = [
  { name: 'Cardiologie', icon: HeartPulse, color: 'rose' as const },
  { name: 'Médecine générale', icon: Stethoscope, color: 'peach' as const },
  { name: 'Dermatologie', icon: Sparkles, color: 'sky' as const },
  { name: 'Pédiatrie', icon: Activity, color: 'violet' as const },
  { name: 'Analyses', icon: Eye, color: 'mint' as const },
];

function specialtyVisual(name: string, index: number) {
  const lower = name.toLowerCase();
  if (lower.includes('cardio')) return { icon: HeartPulse, color: 'rose' as const };
  if (lower.includes('dermato')) return { icon: Sparkles, color: 'sky' as const };
  if (lower.includes('pédiat') || lower.includes('pediat')) return { icon: Activity, color: 'violet' as const };
  if (lower.includes('ophtal')) return { icon: Eye, color: 'mint' as const };
  if (lower.includes('médecine') || lower.includes('general')) return { icon: Stethoscope, color: 'peach' as const };
  return { icon: Stethoscope, color: BUBBLE_COLORS[index % BUBBLE_COLORS.length] };
}

export function PatientDashboardView({
  userId,
  patientId,
}: {
  userId: string;
  patientId: string;
}) {
  const db = useDemoSnapshot();
  const { user, patient } = useDemoSessionUser(userId);
  const locale = useLocale();
  const t = useTranslations('patient.dashboard');
  const tp = useTranslations('patient.profile');
  const tc = useTranslations('common');
  const td = useTranslations('patient.detail');

  const dashboard = useMemo(
    () => (patientId ? getPatientDashboard(patientId) : null),
    // `db` est la source réactive : toute mutation du dépôt recalcule le tableau de bord.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, patientId],
  );

  if (!user || !patient || !dashboard) {
    return (
      <div className="animate-fade-up">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <EmptyState
          icon={<HeartPulse />}
          title={t('emptyTitle')}
          body={t('emptyBody')}
        />
      </div>
    );
  }

  const { last, upcoming, recent, specialties } = dashboard;
  const todayLabel = formatDate(new Date(), locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t('title')}
        title={t('greeting', { name: firstName(user.fullName) })}
        subtitle={t('subtitle')}
        actions={
          <>
            <span className="hidden h-10 items-center gap-2 rounded-full bg-primary-50 px-4 text-xs font-semibold text-primary-700 sm:inline-flex">
              <CalendarDays className="h-3.5 w-3.5" />
              {todayLabel}
            </span>
            <Link href={`/${locale}/patient/qr`} className="btn-violet h-10 px-4 text-xs">
              <QrCode className="h-4 w-4" />
              {t('openQr')}
            </Link>
            <Link href={`/${locale}/patient/claim`} className="btn-outline h-10 px-4 text-xs">
              <ScanLine className="h-4 w-4" />
              {t('addByCode')}
            </Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <StatCard
          className="xl:col-span-8"
          label={t('totalConsultations')}
          value={dashboard.totalCount}
          action={{ label: t('viewAll'), href: `/${locale}/patient/consultations` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {specialties.length > 0
              ? specialties.map((specialty, index) => {
                  const visual = specialtyVisual(specialty.name, index);
                  const Icon = visual.icon;
                  return (
                    <div
                      key={specialty.name}
                      className="flex items-center gap-2 rounded-2xl bg-white/75 px-2.5 py-2 ring-1 ring-white/60"
                    >
                      <IconBubble color={visual.color} size="sm">
                        <Icon />
                      </IconBubble>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-none">{specialty.count}</p>
                        <p className="mt-0.5 max-w-[92px] truncate text-[9px] font-medium text-ink-500">
                          {specialty.name}
                        </p>
                      </div>
                    </div>
                  );
                })
              : DEFAULT_SPECIALTIES.map((specialty) => {
                  const Icon = specialty.icon;
                  return (
                    <div
                      key={specialty.name}
                      className="flex items-center gap-2 rounded-2xl bg-white/45 px-2.5 py-2 ring-1 ring-white/50"
                    >
                      <IconBubble color={specialty.color} size="sm">
                        <Icon />
                      </IconBubble>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-none text-ink-400">0</p>
                        <p className="mt-0.5 max-w-[92px] truncate text-[9px] font-medium text-ink-400">
                          {specialty.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
          </div>
        </StatCard>

        <HighlightCard
          tone="violet"
          className="xl:col-span-4"
          title={t('lastConsultation')}
          icon={<Stethoscope />}
          footer={
            last ? (
              <Link
                href={`/${locale}/patient/consultations/${last.consultation.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-white"
              >
                {td('details')}
                <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            ) : null
          }
        >
          {last ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 text-sm font-bold">
                  {last.doctorUser.fullName.replace('Dr. ', '').slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{last.doctorUser.fullName}</p>
                  <p className="text-[11px] text-white/65">{last.doctor.specialty}</p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-medium leading-snug">
                {last.consultation.reason}
              </p>
              <p className="mt-1.5 text-[11px] text-white/60">
                {formatDate(last.consultation.consultedAt, locale, {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-white/70">{t('noConsultation')}</p>
          )}
        </HighlightCard>

        <HighlightCard
          tone="accent"
          className="xl:col-span-4"
          title={t('nextFollowUp')}
          icon={<CalendarDays />}
        >
          {upcoming && upcoming.consultation.followUpDate ? (
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15">
                <span className="text-2xl font-bold leading-none">
                  {formatDate(upcoming.consultation.followUpDate, locale, { day: '2-digit' })}
                </span>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-white/70">
                  {formatDate(upcoming.consultation.followUpDate, locale, { month: 'short' })}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{upcoming.doctorUser.fullName}</p>
                <p className="mt-0.5 truncate text-[11px] text-white/70">{upcoming.doctor.specialty}</p>
                <p className="mt-1.5 line-clamp-1 text-[11px] text-white/60">
                  {upcoming.consultation.reason}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <p className="text-sm text-white/75">{t('noFollowUp')}</p>
            </div>
          )}
        </HighlightCard>

        <HighlightCard
          tone="ink"
          className="xl:col-span-4"
          title={t('activeAccess')}
          icon={<FolderOpen />}
          footer={
            <Link
              href={`/${locale}/patient/access`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-white"
            >
              {t('manageAccess')}
              <ArrowRight className="h-3 w-3 rtl:rotate-180" />
            </Link>
          }
        >
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20">
              <span className="text-2xl font-bold leading-none">{dashboard.activeGrants}</span>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              {t('activeAccessBody', { count: dashboard.activeGrants })}
            </p>
          </div>
        </HighlightCard>

        <MiniStatCard
          className="xl:col-span-3"
          label={t('doctorsSeen')}
          value={dashboard.doctorsCount}
          hint={t('doctorsCount', { count: dashboard.doctorsCount })}
          icon={<Users />}
          href={`/${locale}/patient/consultations`}
        />
        <MiniStatCard
          className="xl:col-span-4"
          label={t('documents')}
          value={dashboard.documents}
          hint={t('documentsCount', { count: dashboard.documents })}
          icon={<FolderOpen />}
          tone="sky"
          href={`/${locale}/patient/consultations`}
        />
      </div>

      {/* Dossier santé */}
      <div className="mt-4 rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#E9F6F1] text-success">
              <HeartPulse className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">{t('myHealth')}</p>
              <p className="text-[11px] text-ink-400">{patient.patientCode}</p>
            </div>
          </div>
          <Link href={`/${locale}/patient/profile`} className="link-quiet inline-flex items-center gap-1">
            {tc('edit')}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-primary-50/70 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              {tp('bloodType')}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-xs font-bold text-danger">
                {patient.bloodType ?? '—'}
              </span>
              <span className="text-xs font-semibold text-ink-700">
                {patient.bloodType ? patient.bloodType : tc('notProvided')}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-[#FDECE9] p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B56254]">
              {tp('allergies')}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {patient.allergies.length > 0 ? (
                patient.allergies.slice(0, 3).map((item) => (
                  <Badge key={item} variant="red" size="sm">
                    {item}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-ink-400">{tc('none')}</span>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-[#FDF4DE] p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A8811F]">
              {tp('chronicDiseases')}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {patient.chronicDiseases.length > 0 ? (
                patient.chronicDiseases.slice(0, 3).map((item) => (
                  <Badge key={item} variant="yellow" size="sm">
                    {item}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-ink-400">{tc('none')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Consultations récentes */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-lg font-bold">{t('recent')}</h2>
          <Link
            href={`/${locale}/patient/consultations`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800"
          >
            {t('seeAll')}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>

        {recent.length > 0 ? (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {recent.map((item) => (
              <ConsultationCard
                key={item.consultation.id}
                data={{
                  id: item.consultation.id,
                  href: `/${locale}/patient/consultations/${item.consultation.id}`,
                  consultedAt: item.consultation.consultedAt,
                  reason: item.consultation.reason,
                  diagnosis: item.consultation.diagnosis,
                  doctorName: item.doctorUser.fullName,
                  specialty: item.doctor.specialty,
                  documents: item.consultation.attachments.length,
                  prescriptions: item.consultation.prescriptions.length,
                  hidden: item.consultation.hiddenByPatient,
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<QrCode />}
            title={t('emptyTitle')}
            body={t('emptyBody')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href={`/${locale}/patient/qr`} className="btn-violet">
                  <QrCode className="h-4 w-4" />
                  {t('openQr')}
                </Link>
                <Link href={`/${locale}/patient/claim`} className="btn-outline">
                  <ScanLine className="h-4 w-4" />
                  {t('addByCode')}
                </Link>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
