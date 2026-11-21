'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  HeartPulse,
  Link2,
  Lock,
  Pill,
  ShieldCheck,
  ShieldOff,
  Stethoscope,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getAccessLog,
  getActiveGrant,
  getConsultationById,
  getConsultationsByPatient,
  getGrantsForDoctor,
  getGrant,
  getPatientById,
  getUserById,
  recordPatientFileView,
} from '@/lib/demo/repository';
import { useDemoSessionUser, useDemoSnapshot } from '@/lib/demo/use-demo';
import type { DemoConsultation } from '@/lib/demo/types';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

export function DossierView({
  userId,
  doctorId,
  patientId,
}: {
  userId: string;
  doctorId: string;
  patientId: string;
}) {
  const t = useTranslations('doctor.dossier');
  const tpatients = useTranslations('doctor.patients');
  const td = useTranslations('doctor.form');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const ta = useTranslations('patient.access');
  const locale = useLocale();
  const router = useRouter();
  const db = useDemoSnapshot();
  const { doctor: sessionDoctor } = useDemoSessionUser(userId);
  const activeDoctorId = doctorId || sessionDoctor?.id || '';

  const [tab, setTab] = useState<'summary' | 'history'>('summary');
  const [detailId, setDetailId] = useState<string | null>(null);

  const data = useMemo(
    () => {
      const patient = getPatientById(patientId);
      const user = patient ? getUserById(patient.userId) : null;
      return {
        patient,
        user,
        grant: getGrant(activeDoctorId, patientId),
        activeGrant: getActiveGrant(activeDoctorId, patientId),
        consultations: getConsultationsByPatient(patientId),
        grants: getGrantsForDoctor(activeDoctorId).filter((item) => item.patient.id === patientId),
        log: getAccessLog(patientId),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, activeDoctorId, patientId],
  );

  // Chaque section n'est journalisée qu'une fois par montage : recordPatientFileView
  // modifie le repository, donc ces effets ne doivent jamais dépendre du snapshot.
  const recorded = useRef<Set<string>>(new Set());
  useEffect(() => {
    const key = `${patientId}:summary`;
    if (recorded.current.has(key)) return;
    recorded.current.add(key);
    recordPatientFileView(activeDoctorId, patientId, 'summary');
  }, [activeDoctorId, patientId]);

  useEffect(() => {
    if (tab !== 'history') return;
    const key = `${patientId}:history`;
    if (recorded.current.has(key)) return;
    recorded.current.add(key);
    recordPatientFileView(activeDoctorId, patientId, 'history');
  }, [activeDoctorId, patientId, tab]);

  useEffect(() => {
    if (!detailId) return;
    const key = `${patientId}:${detailId}`;
    if (recorded.current.has(key)) return;
    recorded.current.add(key);
    recordPatientFileView(activeDoctorId, patientId, 'consultation');
  }, [activeDoctorId, patientId, detailId]);

  const auditRows = useMemo(
    () =>
      data.log.map((entry) => {
        const scopeLabel = entry.scope === 'FULL' ? ta('scopeFull') : ta('scopeVitals');
        const sectionLabel =
          entry.section === 'summary'
            ? ta('sectionVitals')
            : entry.section === 'history'
              ? ta('sectionHistory')
              : entry.section === 'consultation'
                ? ta('sectionConsultation')
                : '';
        switch (entry.action) {
          case 'PATIENT_FILE_VIEWED':
            return {
              id: entry.id,
              icon: <Eye className="h-4 w-4" />,
              text: ta('logViewed', { section: sectionLabel }),
              date: formatDateTime(entry.createdAt, locale),
              actor: entry.actorName,
              specialty: entry.specialty,
            };
          case 'ACCESS_GRANTED':
            return {
              id: entry.id,
              icon: <ShieldCheck className="h-4 w-4" />,
              text: ta('logGranted', { scope: scopeLabel }),
              date: formatDateTime(entry.createdAt, locale),
              actor: entry.actorName,
              specialty: entry.specialty,
            };
          case 'ACCESS_REVOKED':
            return {
              id: entry.id,
              icon: <ShieldOff className="h-4 w-4" />,
              text: ta('logRevoked'),
              date: formatDateTime(entry.createdAt, locale),
              actor: entry.actorName,
              specialty: entry.specialty,
            };
          case 'LINK_VIA_GRANT':
          case 'CLAIM_ACCEPTED':
            return {
              id: entry.id,
              icon: <Link2 className="h-4 w-4" />,
              text: ta('logLinked'),
              date: formatDateTime(entry.createdAt, locale),
              actor: entry.actorName,
              specialty: entry.specialty,
            };
          default:
            return {
              id: entry.id,
              icon: <Check className="h-4 w-4" />,
              text: entry.action,
              date: formatDateTime(entry.createdAt, locale),
              actor: entry.actorName,
              specialty: entry.specialty,
            };
        }
      }),
    [data.log, ta, locale],
  );

  const detail = detailId ? getConsultationById(detailId) : null;
  const { patient, user, grant, activeGrant, consultations, grants } = data;

  function hrefFor(item: Pick<DemoConsultation, 'id' | 'status'>) {
    if (item.status === 'COMPLETED') {
      return `/${locale}/doctor/consultations/${item.id}/finish`;
    }
    return `/${locale}/doctor/consultations/${item.id}`;
  }

  function authorName(item: DemoConsultation) {
    const authorDoctor = db.doctors.find((item2) => item2.id === item.doctorId);
    if (!authorDoctor) return '';
    return db.users.find((item2) => item2.id === authorDoctor.userId)?.fullName ?? '';
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={t('title')}
        title={patient && user ? user.fullName : t('title')}
        subtitle={t('readOnly')}
        actions={
          <Link href={`/${locale}/doctor/patients`} className="btn-outline h-10 px-4 text-xs">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t('backToPatients')}
          </Link>
        }
      />

      {!patient || !user ? (
        <EmptyState
          icon={<Lock className="h-6 w-6 text-ink-400" />}
          title={tc('noData')}
          body={t('lockedBody')}
          action={
            <Link href={`/${locale}/doctor/patients`} className="btn-violet">
              {t('lockedCta')}
            </Link>
          }
        />
      ) : (
        <>
          {!activeGrant ? (
            <div className="mb-4 flex flex-wrap items-start gap-3 rounded-3xl bg-[#FDECEC] p-4 ring-1 ring-[#F5C6C6]">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-danger">{te('GRANT_REQUIRED')}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                  {grant ? t('expiredAt', { date: formatDate(grant.expiresAt, locale) }) : tpatients('reapplyHint')}
                </p>
              </div>
              <Badge variant="red">{tpatients('expiredLabel')}</Badge>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 p-5 text-white shadow-soft">
                <span className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/10" />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.fullName} size="xl" tone="soft" className="bg-white/20 text-white" />
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold leading-tight">{user.fullName}</h2>
                      <p className="mt-0.5 text-[11px] text-white/65">
                        {t('patientCode')}: {patient.patientCode}
                      </p>
                    </div>
                  </div>
                  <Badge variant="white">
                    {activeGrant?.scope === 'FULL' ? tpatients('scopeFull') : tpatients('scopeVitals')}
                  </Badge>
                </div>

                <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-white/10 px-2 py-3">
                    <p className="text-lg font-bold leading-none">
                      {patient.birthDate ? yearsOf(new Date(patient.birthDate)) : '—'}
                    </p>
                    <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/60">
                      {t('age')}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-2 py-3">
                    <p className="text-lg font-bold leading-none">{genderLabel(patient.gender, t)}</p>
                    <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/60">
                      {t('gender')}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-2 py-3">
                    <p className="text-lg font-bold leading-none">{patient.bloodType ?? '—'}</p>
                    <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/60">
                      {t('bloodType')}
                    </p>
                  </div>
                </div>

                <div className="relative mt-4 flex items-center justify-between gap-2 rounded-2xl bg-black/15 px-4 py-2.5 text-[11px]">
                  <span className="flex items-center gap-1.5 font-semibold text-white/85">
                    <Lock className="h-3.5 w-3.5" />
                    {t('readOnly')}
                  </span>
                  <span className="tabular-nums text-white/70">
                    {activeGrant
                      ? t('remaining', { time: remainingLabel(activeGrant.expiresAt) })
                      : tpatients('expiredLabel')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/${locale}/doctor/consultations/new?patientId=${patient.id}&patientName=${encodeURIComponent(user.fullName)}`,
                    )
                  }
                  className="btn relative mt-4 w-full justify-center bg-white py-3 text-xs font-bold text-primary-700 shadow-soft hover:bg-primary-50"
                >
                  <ClipboardList className="h-4 w-4" />
                  {t('startConsultation')}
                </button>
              </div>

              <div className="mt-4 rounded-[28px] bg-[#FDEEE4] p-5 ring-1 ring-accent-200">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4 text-accent-600" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-accent-600">
                    {t('allergies')}
                  </h3>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {patient.allergies.length > 0 ? (
                    patient.allergies.map((item) => (
                      <span key={item} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-accent-700 shadow-sm">
                        {item}
                      </span>
                    ))
                  ) : (
                    <p className="text-[11px] text-ink-500">{t('noAllergies')}</p>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-accent-600" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-accent-600">
                    {t('chronicDiseases')}
                  </h3>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {patient.chronicDiseases.length > 0 ? (
                    patient.chronicDiseases.map((item) => (
                      <span key={item} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-accent-700 shadow-sm">
                        {item}
                      </span>
                    ))
                  ) : (
                    <p className="text-[11px] text-ink-500">{t('noChronicDiseases')}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="xl:col-span-8">
              <div className="mb-3 flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-line/70">
                {(
                  [
                    { key: 'summary', label: t('summaryTab') },
                    { key: 'history', label: t('historyTab') },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={cn(
                      'flex-1 rounded-full px-4 py-2.5 text-[11px] font-bold transition-all',
                      tab === key ? 'bg-primary-600 text-white shadow-soft' : 'text-ink-500 hover:text-ink-900',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'summary' ? (
                <div className="space-y-4">
                  <div className="rounded-[28px] bg-white p-6 ring-1 ring-line/70">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoRow label={t('patientCode')} value={patient.patientCode} />
                      <InfoRow label={t('gender')} value={genderLabel(patient.gender, t)} />
                      <InfoRow label={t('bloodType')} value={patient.bloodType ?? '—'} />
                      <InfoRow
                        label={t('age')}
                        value={
                          patient.birthDate
                            ? `${yearsOf(new Date(patient.birthDate))} ${locale === 'ar' ? 'سنة' : 'ans'}`
                            : '—'
                        }
                      />
                    </div>
                    <div className="mt-6 flex items-start gap-2 rounded-2xl bg-primary-50/70 px-4 py-3 text-[11px] leading-relaxed text-ink-500">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                      <span>{t('demoNote')}</span>
                    </div>
                  </div>

                  <section className="rounded-[28px] bg-white p-5 ring-1 ring-line/70 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
                        {tpatients('activeSection')}
                      </h3>
                      <Badge variant="violet">{grants.length}</Badge>
                    </div>
                    {grants.length === 0 ? (
                      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
                        {tpatients('reapplyHint')}
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {grants.map((item) => (
                          <div
                            key={item.grant.id}
                            className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary-50/50 px-4 py-3 ring-1 ring-primary-100/60"
                          >
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-primary-600">
                              <ShieldCheck className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-ink-900">
                                {item.grant.scope === 'FULL' ? tpatients('scopeFull') : tpatients('scopeVitals')}
                              </p>
                              <p className="mt-0.5 text-[10px] text-ink-400">
                                {ta('expiresAt', { date: formatDateTime(item.grant.expiresAt, locale) })}
                                {item.grant.lastAccessAt
                                  ? ` · ${ta('lastAccess', { date: formatDateTime(item.grant.lastAccessAt, locale) })}`
                                  : ''}
                              </p>
                            </div>
                            <Badge
                              variant={
                                item.active ? 'green' : item.grant.revokedAt ? 'red' : 'gray'
                              }
                            >
                              {item.active
                                ? tpatients('remainingHint')
                                : item.grant.revokedAt
                                  ? ta('revoke')
                                  : tpatients('expiredLabel')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-[28px] bg-white p-5 ring-1 ring-line/70 sm:p-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
                      {ta('historySection')}
                    </h3>
                    {auditRows.length === 0 ? (
                      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
                        {ta('emptyHistoryBody')}
                      </p>
                    ) : (
                      <ol className="mt-3 space-y-0">
                        {auditRows.map((row) => (
                          <li key={row.id} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                              {row.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold leading-snug text-ink-900">
                                {row.actor ? <span className="font-bold">{row.actor}</span> : null}{' '}
                                {row.text}
                              </p>
                              <p className="mt-0.5 text-[10px] tabular-nums text-ink-400">
                                {row.date}
                                {row.specialty ? ` · ${row.specialty}` : ''}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </div>
              ) : consultations.length === 0 ? (
                <div className="rounded-[28px] bg-white p-10 text-center ring-1 ring-line/70">
                  <p className="text-sm text-ink-400">{t('noHistoryTitle')}</p>
                </div>
              ) : (
                <div className="rounded-[28px] bg-white ring-1 ring-line/70">
                  <ol className="divide-y divide-line">
                    {consultations.map((item) => (
                      <li key={item.id}>
                        <div className="flex items-start gap-2 px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setDetailId(item.id)}
                            className="group flex min-w-0 flex-1 items-start gap-3 text-start transition-colors hover:bg-primary-50/40"
                          >
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                              <Stethoscope className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="text-xs font-bold text-ink-500">
                                  {formatDate(item.consultedAt, locale, {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                <StatusBadge status={item.status} />
                              </span>
                              <span className="mt-1 block truncate text-sm font-semibold text-ink-900">
                                {item.reason || '—'}
                              </span>
                              {item.diagnosis ? (
                                <span className="mt-0.5 block truncate text-[11px] text-ink-500">
                                  {item.diagnosis}
                                </span>
                              ) : null}
                            </span>
                            <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
                          </button>
                          <Link
                            href={hrefFor(item)}
                            title={tc('view')}
                            aria-label={tc('view')}
                            className="mt-2 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600 transition-colors hover:bg-primary-600 hover:text-white"
                          >
                            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>

          <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
            <DialogContent className="max-w-2xl" hideClose>
              {!detail ? (
                <div className="grid h-56 place-items-center">
                  <EmptyState icon={<FileText className="h-6 w-6" />} title={te('NOT_FOUND')} compact />
                </div>
              ) : (
                <>
                  <DialogHeader>
                    <div className="flex items-center justify-between gap-3 pe-8">
                      <DialogTitle>{t('consultationTitle')}</DialogTitle>
                      <button
                        type="button"
                        onClick={() => setDetailId(null)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-primary-50 text-ink-500 hover:bg-primary-100"
                        aria-label={tc('close')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-ink-400">
                      {t('byDoctor', { doctor: authorName(detail) || '—' })} ·{' '}
                      {formatDate(detail.consultedAt, locale, {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </DialogHeader>

                  <div className="max-h-[60vh] space-y-4 overflow-y-auto pe-1">
                    <DetailRow icon={<CalendarDays className="h-4 w-4" />} label={td('reasonLabel')}>
                      {detail.reason || '—'}
                    </DetailRow>
                    <DetailRow icon={<Stethoscope className="h-4 w-4" />} label={td('symptoms')}>
                      {detail.symptoms || '—'}
                    </DetailRow>
                    {detail.examination ? (
                      <DetailRow icon={<ClipboardList className="h-4 w-4" />} label={td('examination')}>
                        {detail.examination}
                      </DetailRow>
                    ) : null}
                    <DetailRow icon={<FileText className="h-4 w-4" />} label={td('diagnosis')}>
                      {detail.diagnosis || '—'}
                    </DetailRow>
                    <DetailRow icon={<Pill className="h-4 w-4" />} label={td('treatmentLabel')}>
                      {detail.treatment || '—'}
                    </DetailRow>
                    {detail.prescriptions.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                          {td('prescriptions')}
                        </p>
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                          {detail.prescriptions.map((rx) => (
                            <li key={rx.id} className="rounded-2xl bg-primary-50/60 px-4 py-3">
                              <p className="text-xs font-bold text-ink-900">{rx.medication}</p>
                              <p className="mt-0.5 text-[11px] text-ink-500">
                                {rx.dosage} · {rx.frequency} · {rx.duration}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {detail.recommendations ? (
                      <DetailRow icon={<ClipboardList className="h-4 w-4" />} label={td('recommendations')}>
                        {detail.recommendations}
                      </DetailRow>
                    ) : null}
                    {detail.followUpDate ? (
                      <DetailRow icon={<CalendarDays className="h-4 w-4" />} label={td('followUpDate')}>
                        {formatDate(detail.followUpDate, locale, {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </DetailRow>
                    ) : null}
                    {detail.attachments.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                          {t('attachments')}
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {detail.attachments.map((file) => (
                            <li
                              key={file.id}
                              className="inline-flex items-center gap-2 rounded-full bg-primary-50/60 px-3 py-2 text-[11px] font-semibold text-ink-600"
                            >
                              <FileText className="h-3.5 w-3.5 text-primary-500" />
                              <span className="max-w-[180px] truncate">{file.fileName}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-primary-50/50 px-4 py-3.5 ring-1 ring-primary-100/60">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink-900">{value}</p>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
        <span className="text-primary-500">{icon}</span>
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-700">{children}</p>
    </div>
  );
}

function yearsOf(date: Date): number {
  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) years -= 1;
  return Math.max(0, years);
}

function remainingLabel(expiresAt: string): string {
  const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, '0')} min` : `${minutes} min`;
}

function genderLabel(gender: 'M' | 'F' | null, t: (key: string) => string): string {
  if (gender === 'M') return t('male');
  if (gender === 'F') return t('female');
  return '—';
}
