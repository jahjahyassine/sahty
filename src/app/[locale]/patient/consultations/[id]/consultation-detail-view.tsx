'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Download,
  EyeOff,
  FileText,
  HeartPulse,
  MapPin,
  Paperclip,
  Pill,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import {
  getConsultationView,
  getPatientConsultation,
} from '@/lib/demo/repository';
import { useDemoSnapshot } from '@/lib/demo/use-demo';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar } from '@/components/ui/avatar';
import { formatBytes } from '@/lib/files';
import { formatDate } from '@/lib/utils';
import { PrintButton } from './print-button';
import { HideConsultationButton } from './hide-button';

function Section({
  icon,
  title,
  children,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: 'accent' | 'primary' | 'success';
}) {
  return (
    <section className="print-card rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={
            tone === 'accent'
              ? 'grid h-8 w-8 place-items-center rounded-xl bg-accent-100 text-accent-500 [&>svg]:h-4 [&>svg]:w-4'
              : tone === 'success'
                ? 'grid h-8 w-8 place-items-center rounded-xl bg-[#E9F6F1] text-success [&>svg]:h-4 [&>svg]:w-4'
                : 'grid h-8 w-8 place-items-center rounded-xl bg-primary-50 text-primary-500 [&>svg]:h-4 [&>svg]:w-4'
          }
        >
          {icon}
        </span>
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
      </div>
      <div className="text-sm leading-relaxed text-ink-700">{children}</div>
    </section>
  );
}

export function PatientConsultationDetailView({
  patientId,
  consultationId,
}: {
  userId: string;
  patientId: string;
  consultationId: string;
}) {
  const db = useDemoSnapshot();
  const locale = useLocale();
  const t = useTranslations('patient.detail');
  const tc = useTranslations('common');
  const tq = useTranslations('patient.consultations');
  const tm = useTranslations('linkMethod');
  const tk = useTranslations('doctor.form');

  const view = useMemo(() => {
    if (!patientId || !getPatientConsultation(patientId, consultationId)) return null;
    return getConsultationView(consultationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, patientId, consultationId]);

  const backLink = (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
      <Link
        href={`/${locale}/patient/consultations`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition-colors hover:text-primary-700"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        {t('back')}
      </Link>
      {view ? (
        <div className="flex items-center gap-2">
          <HideConsultationButton
            patientId={patientId}
            consultationId={view.consultation.id}
            hidden={view.consultation.hiddenByPatient}
          />
          <PrintButton label={t('exportPdf')} />
        </div>
      ) : null}
    </div>
  );

  if (!view) {
    return (
      <div>
        {backLink}
        <EmptyState
          icon={<FileText />}
          title={t('notFound')}
          body={t('notFoundBody')}
          action={
            <Link href={`/${locale}/patient/consultations`} className="btn-violet">
              {t('back')}
            </Link>
          }
        />
      </div>
    );
  }

  const { consultation, doctor, doctorUser, patient, patientUser } = view;

  const kindLabel = (kind: string) => {
    if (kind === 'LAB') return tk('kindLAB');
    if (kind === 'IMAGING') return tk('kindIMAGING');
    if (kind === 'PRESCRIPTION') return tk('kindPRESCRIPTION');
    return tk('kindOTHER');
  };

  return (
    <div className="animate-fade-up">
      {backLink}

      <article className="print-area">
        {/* En-tête impression */}
        <div className="mb-4 hidden items-center justify-between border-b border-line pb-4 print:flex">
          <div>
            <p className="font-arabic text-xl font-bold text-primary-700">صحتي · Sahty</p>
            <p className="text-[10px] text-ink-400">{t('printTitle')}</p>
          </div>
          <div className="text-end text-[10px] text-ink-500">
            <p className="font-semibold text-ink-900">{patientUser?.fullName ?? '—'}</p>
            <p>{patient?.patientCode ?? '—'}</p>
          </div>
        </div>

        {consultation.hiddenByPatient ? (
          <div className="no-print mb-3 flex items-center gap-2 rounded-2xl bg-[#FDF4DE] px-4 py-3 text-xs font-medium text-[#8A6A18]">
            <EyeOff className="h-4 w-4" />
            {tq('hiddenNotice')}
          </div>
        ) : null}

        {/* Hero */}
        <div className="relative overflow-hidden rounded-[30px] bg-primary-600 p-6 text-white shadow-soft sm:p-7">
          <span className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-accent-400/15" />

          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                {t('consultationDate')}
              </p>
              <p className="mt-1 text-sm font-medium text-white/85">
                {formatDate(consultation.consultedAt, locale, {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-[28px]">{consultation.reason}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
                  <Stethoscope className="h-3 w-3" />
                  {doctorUser.fullName}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium">
                  {doctor.specialty}
                </span>
                {consultation.linkMethod ? (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium">
                    {t('via', { method: tm(consultation.linkMethod) })}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
              <Avatar name={doctorUser.fullName} src={doctorUser.avatarUrl} size="lg" tone="peach" />
              <div className="hidden sm:block">
                <p className="text-xs font-bold">{doctorUser.fullName}</p>
                <p className="text-[10px] text-white/60">{doctor.specialty}</p>
                {doctor.city ? (
                  <p className="mt-0.5 text-[10px] text-white/50">{doctor.city}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            {consultation.diagnosis ? (
              <section className="print-card rounded-3xl bg-[#FDF7F3] p-5 shadow-card ring-1 ring-accent-100">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-100 text-accent-500">
                    <HeartPulse className="h-4 w-4" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-600/80">
                    {t('diagnosis')}
                  </p>
                </div>
                <p className="mt-3 text-base font-semibold leading-relaxed text-ink-900">
                  {consultation.diagnosis}
                </p>
              </section>
            ) : null}

            {consultation.symptoms ? (
              <Section icon={<FileText />} title={t('symptoms')}>
                <p className="whitespace-pre-line">{consultation.symptoms}</p>
              </Section>
            ) : null}

            {consultation.examination ? (
              <Section icon={<Stethoscope />} title={t('examination')}>
                <p className="whitespace-pre-line">{consultation.examination}</p>
              </Section>
            ) : null}

            {consultation.treatment ? (
              <Section icon={<Pill />} title={t('treatment')} tone="success">
                <p className="whitespace-pre-line">{consultation.treatment}</p>
              </Section>
            ) : null}

            <Section icon={<Pill />} title={t('prescriptions')} tone="accent">
              {consultation.prescriptions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-start text-[10px] uppercase tracking-wider text-ink-400">
                        <th className="pb-2 text-start font-semibold">{t('medication')}</th>
                        <th className="pb-2 text-start font-semibold">{t('dosage')}</th>
                        <th className="pb-2 text-start font-semibold">{t('frequency')}</th>
                        <th className="pb-2 text-start font-semibold">{t('duration')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {consultation.prescriptions.map((med) => (
                        <tr key={med.id}>
                          <td className="py-2.5 pe-3 font-semibold text-ink-900">
                            {med.medication}
                            {med.notes ? (
                              <p className="mt-0.5 text-[10px] font-normal text-ink-400">{med.notes}</p>
                            ) : null}
                          </td>
                          <td className="py-2.5 pe-3">{med.dosage}</td>
                          <td className="py-2.5 pe-3">{med.frequency}</td>
                          <td className="py-2.5">{med.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-ink-400">{t('noPrescriptions')}</p>
              )}
            </Section>

            {consultation.recommendations ? (
              <Section icon={<ShieldCheck />} title={t('recommendations')} tone="success">
                <p className="whitespace-pre-line">{consultation.recommendations}</p>
              </Section>
            ) : null}
          </div>

          <aside className="space-y-4 lg:col-span-4">
            <div className="print-card rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
              <div className="flex items-center gap-3">
                <Avatar name={doctorUser.fullName} size="lg" tone="peach" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-900">{doctorUser.fullName}</p>
                  <p className="text-[11px] text-ink-500">{doctor.specialty}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-[11px] text-ink-500">
                {doctor.clinicName ? (
                  <p className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-ink-300" />
                    {doctor.clinicName}
                  </p>
                ) : null}
                {doctor.city ? (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-ink-300" />
                    {doctor.city}
                  </p>
                ) : null}
                {consultation.linkedAt ? (
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-ink-300" />
                    {t('linkedOn', { date: formatDate(consultation.linkedAt, locale) })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="print-card rounded-3xl bg-primary-50 p-5 ring-1 ring-primary-100/60">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary-600" />
                <p className="text-xs font-bold text-ink-900">{t('followUp')}</p>
              </div>
              {consultation.followUpDate ? (
                <div className="mt-3 flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-primary-700 shadow-sm">
                    <span className="text-lg font-bold leading-none">
                      {formatDate(consultation.followUpDate, locale, { day: '2-digit' })}
                    </span>
                    <span className="mt-0.5 text-[8px] font-semibold uppercase">
                      {formatDate(consultation.followUpDate, locale, { month: 'short' })}
                    </span>
                  </span>
                  <p className="text-xs font-medium text-ink-700">
                    {formatDate(consultation.followUpDate, locale, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-ink-400">{tc('none')}</p>
              )}
            </div>

            <div className="print-card rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-primary-500" />
                  <p className="text-xs font-bold text-ink-900">{t('attachments')}</p>
                </div>
                <Badge variant="gray">{consultation.attachments.length}</Badge>
              </div>

              {consultation.attachments.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {consultation.attachments.map((file) => {
                    const inner = (
                      <>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-primary-600 shadow-sm">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-semibold text-ink-900">
                            {file.fileName}
                          </span>
                          <span className="text-[9px] text-ink-400">
                            {kindLabel(file.kind)} · {formatBytes(file.sizeBytes)}
                          </span>
                        </span>
                        {file.dataUrl ? <Download className="h-3.5 w-3.5 shrink-0 text-primary-500" /> : null}
                      </>
                    );
                    const classes =
                      'flex items-center gap-2.5 rounded-2xl bg-primary-50/70 p-2.5 transition-colors';
                    return file.dataUrl ? (
                      <a
                        key={file.id}
                        href={file.dataUrl}
                        download={file.fileName}
                        className={`${classes} hover:bg-primary-100/70`}
                      >
                        {inner}
                      </a>
                    ) : (
                      <div key={file.id} className={classes}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-xs text-ink-400">{t('noAttachments')}</p>
              )}
            </div>

            <div className="no-print flex items-center gap-2 rounded-2xl bg-white/70 p-3 text-[10px] text-ink-400 ring-1 ring-line/60">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" />
              {t('readOnly')}
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
