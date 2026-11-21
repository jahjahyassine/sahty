'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  KeyRound,
  Link2,
  Loader2,
  Printer,
  QrCode,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { QRScanner } from '@/components/shared/qr-scanner';
import { StatusBadge } from '@/components/shared/status-badge';
import { LogoMark } from '@/components/shared/logo';
import { useDemoSnapshot } from '@/lib/demo/use-demo';
import { claimQrPayload } from '@/lib/demo/codes';
import {
  DemoRepositoryError,
  approveConsultation,
  generateClaimCode,
  getConsultationView,
  getPatientById,
  linkConsultation,
  redeemPatientQr,
} from '@/lib/demo/repository';
import type { ConsultationReportInput, LinkMethod } from '@/lib/demo/types';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

type Mode = 'review' | 'approved' | 'linked' | 'share' | 'scan' | 'code' | 'claim';

function reportFromConsultation(consultation: {
  reason: string;
  symptoms: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatment: string | null;
  recommendations: string | null;
  followUpDate: string | null;
  prescriptions: ConsultationReportInput['prescriptions'];
}): ConsultationReportInput {
  return {
    reason: consultation.reason,
    symptoms: consultation.symptoms,
    examination: consultation.examination,
    diagnosis: consultation.diagnosis,
    treatment: consultation.treatment,
    recommendations: consultation.recommendations,
    followUpDate: consultation.followUpDate,
    prescriptions: consultation.prescriptions.map((row) => ({
      medication: row.medication,
      dosage: row.dosage,
      frequency: row.frequency,
      duration: row.duration,
      notes: row.notes,
    })),
  };
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-primary-50/60 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-ink-800">
        {value || '—'}
      </p>
    </div>
  );
}

export function ApprovalFlow({
  consultationId,
  doctorId,
}: {
  consultationId: string;
  doctorId: string;
}) {
  const t = useTranslations('doctor.approval');
  const tf = useTranslations('doctor.form');
  const tc = useTranslations('common');
  const te = useTranslations('errors');
  const tm = useTranslations('linkMethod');
  const locale = useLocale();
  const db = useDemoSnapshot();

  // `db` est une dépendance volontaire : le repository lit l'état module qui
  // change avec le snapshot, même si `db` n'est pas référencé dans le callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo(() => getConsultationView(consultationId), [db, consultationId]);
  const [mode, setMode] = useState<Mode>('review');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  function messageFor(err: unknown) {
    if (err instanceof DemoRepositoryError) {
      const known = [
        'LINK_INVALID',
        'LINK_EXPIRED',
        'LINK_USED',
        'CONSULTATION_NOT_LINKABLE',
        'CLAIM_INVALID',
        'CLAIM_EXPIRED',
        'CLAIM_USED',
        'COMPLETE_REQUIRED',
        'GRANT_REQUIRED',
        'GRANT_SCOPE_REQUIRED',
        'VALIDATION',
        'NOT_FOUND',
      ];
      if (known.includes(err.code)) return te(err.code);
      return t('linkError');
    }
    return t('linkError');
  }

  if (!view) {
    return (
      <div className="rounded-[30px] bg-white p-8 text-center shadow-card ring-1 ring-line/70">
        <p className="text-sm font-bold text-ink-900">{te('NOT_FOUND')}</p>
        <Link href={`/${locale}/doctor/consultations`} className="btn-violet mt-4">
          {t('backToConsultations')}
        </Link>
      </div>
    );
  }

  const { consultation, patient, patientUser } = view;
  const report = reportFromConsultation(consultation);
  const canApprove = consultation.status === 'COMPLETED' && !consultation.approvedAt;
  const isApproved = consultation.status === 'COMPLETED' && !!consultation.approvedAt;

  function handleApprove() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      approveConsultation(consultationId, report, doctorId);
      setMode('approved');
      toast.success(t('approvedTitle'));
    } catch (err) {
      const message = messageFor(err);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function performLink(patientId: string, method: LinkMethod, raw?: string) {
    setBusy(true);
    setError(null);
    try {
      if (raw) redeemPatientQr(doctorId, raw);
      linkConsultation(consultationId, { patientId, method });
      setMode('linked');
      toast.success(t('linkedTitle'));
    } catch (err) {
      const message = messageFor(err);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function linkFromRaw(raw: string) {
    const value = raw.trim();
    if (!value) return;
    try {
      const result = redeemPatientQr(doctorId, value);
      performLink(result.patient.id, 'PATIENT_QR', value);
    } catch (err) {
      const message = messageFor(err);
      setError(message);
      toast.error(message);
    }
  }

  function linkKnownPatient() {
    if (!patient) return;
    performLink(patient.id, 'ACCESS_GRANT');
  }

  function handleGenerateClaim() {
    setBusy(true);
    setError(null);
    try {
      generateClaimCode(consultationId);
      setMode('claim');
    } catch (err) {
      const message = messageFor(err);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function copyClaim() {
    const claim = consultation.claimCode;
    if (!claim) return;
    try {
      await navigator.clipboard.writeText(claim.code.replace(/-/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error(tc('networkError'));
    }
  }

  const errorBanner = error ? (
    <div className="flex items-start gap-2 rounded-2xl bg-[#FDECEC] px-4 py-3 text-xs font-medium text-danger">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{error}</span>
    </div>
  ) : null;

  const header = (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
      <Link
        href={`/${locale}/doctor/consultations/${consultationId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition-colors hover:text-primary-700"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        {t('back')}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={consultation.status} />
        <span className="text-[11px] text-ink-400">
          {formatDate(consultation.consultedAt, locale, {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );

  const reportCard = (
    <div className="rounded-[30px] bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-900">{t('summaryTitle')}</h2>
        <span className="text-[11px] font-semibold text-primary-700">{consultation.reason}</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <Field label={tf('reasonLabel')} value={consultation.reason} />
        <Field label={tf('symptoms')} value={consultation.symptoms} />
        <Field label={tf('examination')} value={consultation.examination} />
        <Field label={tf('diagnosis')} value={consultation.diagnosis} />
        <Field label={tf('treatmentLabel')} value={consultation.treatment} />
        <Field label={tf('recommendations')} value={consultation.recommendations} />
      </div>
      {consultation.prescriptions.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-ink-400">
                <th className="pb-2 text-start font-semibold">{tf('medication')}</th>
                <th className="pb-2 text-start font-semibold">{tf('dosage')}</th>
                <th className="pb-2 text-start font-semibold">{tf('frequency')}</th>
                <th className="pb-2 text-start font-semibold">{tf('duration')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {consultation.prescriptions.map((row) => (
                <tr key={row.id}>
                  <td className="py-2.5 pe-3 font-semibold text-ink-900">{row.medication}</td>
                  <td className="py-2.5 pe-3">{row.dosage}</td>
                  <td className="py-2.5 pe-3">{row.frequency}</td>
                  <td className="py-2.5">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );

  if (consultation.status === 'DRAFT') {
    return (
      <div className="animate-fade-up">
        {header}
        <div className="rounded-[30px] bg-white p-8 text-center shadow-card ring-1 ring-line/70 sm:p-12">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#FDF4DE] text-[#C2912A]">
            <ClipboardCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-xl font-bold">{t('draftTitle')}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            {t('draftBody')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href={`/${locale}/doctor/consultations/${consultationId}`}
              className="btn-violet"
            >
              {t('back')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <Link href={`/${locale}/doctor/consultations`} className="btn-outline">
              {t('backToConsultations')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (consultation.status === 'LINKED' || mode === 'linked') {
    return (
      <div className="animate-fade-up">
        {header}
        <div className="rounded-[30px] bg-white p-6 text-center shadow-card ring-1 ring-line/70 sm:p-10">
          <span className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#E9F6F1]">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[#8FD9BE]/40" />
            <CheckCircle2 className="relative h-10 w-10 text-success" />
          </span>
          <h1 className="mt-5 text-xl font-bold">{t('linkedTitle')}</h1>
          <p className="mt-2 text-sm text-ink-500">{t('linkedBody')}</p>
          {patientUser ? (
            <p className="mt-4 inline-flex rounded-full bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700">
              {t('knownPatient', { name: patientUser.fullName })}
            </p>
          ) : null}
          {consultation.linkMethod ? (
            <p className="mt-2 text-[11px] text-ink-400">{tm(consultation.linkMethod)}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href={`/${locale}/doctor/consultations/${consultationId}`}
              className="btn-violet"
            >
              {t('viewConsultation')}
            </Link>
            <Link href={`/${locale}/doctor/consultations`} className="btn-outline">
              {t('backToConsultations')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'claim' && consultation.claimCode) {
    const claimUrl = claimQrPayload(consultation.claimCode.code);
    return (
      <div className="animate-fade-up">
        {header}
        <div className="no-print mx-auto mb-4 flex max-w-[440px] flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleGenerateClaim} disabled={busy}>
            <QrCode className="h-3.5 w-3.5" />
            {t('generateClaim')}
          </Button>
          <Button type="button" variant="soft" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
            {t('print')}
          </Button>
        </div>
        <div className="print-card mx-auto max-w-[440px] overflow-hidden rounded-[30px] bg-white shadow-card ring-1 ring-line/70">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-[#F6F4FC] px-6 py-4">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-10 w-10 rounded-xl" />
              <div>
                <p className="font-arabic text-base font-bold leading-none text-primary-700">صحتي</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Sahty
                </p>
              </div>
            </div>
            <p className="text-[10px] font-semibold text-ink-900">{t('claimTitle')}</p>
          </div>
          <div className="flex flex-col items-center px-6 py-6 text-center">
            <div className="rounded-2xl border border-line bg-white p-3">
              <QRCodeSVG
                value={claimUrl}
                size={196}
                level="H"
                bgColor="#FFFFFF"
                fgColor="#14131C"
                marginSize={0}
              />
            </div>
            <p className="ltr-code mt-5 text-3xl font-bold tracking-[0.18em]">
              {consultation.claimCode.code}
            </p>
            <div className="mt-4 w-full rounded-2xl bg-primary-50 px-4 py-3">
              <p className="text-[11px] font-semibold text-primary-700">{t('claimHelp')}</p>
              <p className="mt-0.5 text-[10px] text-ink-500">
                {t('expiresAt', {
                  date: formatDate(consultation.claimCode.expiresAt, locale, {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="no-print mx-auto mt-4 flex max-w-[440px] flex-wrap justify-center gap-2">
          <Button type="button" variant="soft" size="md" onClick={() => void copyClaim()}>
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? tc('copied') : t('copy')}
          </Button>
          <Link href={`/${locale}/doctor/consultations`} className="btn-outline h-11 px-5 text-xs">
            {t('backToConsultations')}
          </Link>
        </div>
      </div>
    );
  }

  if (mode === 'scan' || mode === 'code') {
    return (
      <div className="animate-fade-up">
        {header}
        <div className="rounded-[30px] bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('approved');
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-primary-700"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              {tc('back')}
            </button>
            <div className="flex items-center gap-1 rounded-full bg-primary-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('scan');
                  setError(null);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold',
                  mode === 'scan' ? 'bg-white text-primary-700 shadow-sm' : 'text-ink-500',
                )}
              >
                <Camera className="h-3.5 w-3.5" />
                {t('scanQr')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('code');
                  setError(null);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold',
                  mode === 'code' ? 'bg-white text-primary-700 shadow-sm' : 'text-ink-500',
                )}
              >
                <KeyRound className="h-3.5 w-3.5" />
                {t('enterCode')}
              </button>
            </div>
          </div>

          {mode === 'scan' ? (
            <div className="mt-4">
              <QRScanner
                onResult={(raw) => {
                  if (!busy) linkFromRaw(raw);
                }}
                paused={busy}
                hint={t('scanQrDesc')}
                className="mx-auto w-full max-w-md"
              />
              {busy ? (
                <p className="mt-3 text-center text-xs font-semibold text-primary-600">
                  <Loader2 className="me-1 inline h-3.5 w-3.5 animate-spin" />
                  {t('linking')}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center">
              <p className="text-sm font-bold">{t('enterCode')}</p>
              <p className="mt-1 text-[11px] text-ink-400">{t('enterCodeDesc')}</p>
              <CodeInput
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setError(null);
                }}
                onComplete={(value) => linkFromRaw(value)}
                disabled={busy}
                autoFocus
                className="mt-5"
              />
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="mt-6 w-full max-w-xs"
                onClick={() => linkFromRaw(code)}
                disabled={busy || code.length < 6}
              >
                <Link2 className="h-4 w-4" />
                {busy ? t('linking') : t('linkCta')}
              </Button>
            </div>
          )}

          <p className="mt-4 text-center text-[10px] text-ink-400">{t('demoNotice')}</p>
          {error ? <div className="mt-4">{errorBanner}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {header}
      <div className="mb-4 rounded-[28px] bg-gradient-to-l from-primary-500 to-primary-700 p-5 text-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
              {t('title')}
            </p>
            <h1 className="mt-1 text-xl font-bold">
              {canApprove ? t('approveTitle') : t('approvedTitle')}
            </h1>
            <p className="mt-1 text-[11px] leading-relaxed text-white/75">
              {canApprove ? t('approveBody') : t('approvedBody')}
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 text-[11px]">
            <p className="font-semibold">{consultation.reason}</p>
            {consultation.approvedAt ? (
              <p className="mt-1 text-white/70">
                {t('approvedOn', {
                  date: formatDateTime(consultation.approvedAt, locale),
                })}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <div className="mb-4">{errorBanner}</div> : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">{reportCard}</div>

        <div className="space-y-4 lg:col-span-5">
          {canApprove ? (
            <div className="rounded-[28px] bg-white p-5 shadow-card ring-1 ring-line/70">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E9F6F1] text-success">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <p className="text-sm font-bold text-ink-900">{t('approveTitle')}</p>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-500">{t('approveBody')}</p>
              {!report.diagnosis?.trim() ? (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FDF4DE] px-3 py-2 text-[11px] text-[#8A6A18]">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t('missingDiagnosis')}
                </p>
              ) : null}
              {!report.reason.trim() ? (
                <p className="mt-2 flex items-start gap-2 rounded-xl bg-[#FDF4DE] px-3 py-2 text-[11px] text-[#8A6A18]">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t('missingReason')}
                </p>
              ) : null}
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-2xl bg-primary-50/70 p-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#4B3BA8]"
                />
                <span className="text-[11px] font-semibold text-ink-700">{t('approveCheckbox')}</span>
              </label>
              <Button
                type="button"
                variant="violet"
                size="lg"
                className="mt-4 w-full"
                onClick={handleApprove}
                disabled={!confirmed || busy || !report.diagnosis?.trim() || !report.reason.trim()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {busy ? t('approving') : t('approveCta')}
              </Button>
            </div>
          ) : (
            <div className="rounded-[28px] bg-[#E9F6F1] p-5 ring-1 ring-[#D8F0E7]">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-bold">{t('approvedTitle')}</p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-600">{t('approvedBody')}</p>
            </div>
          )}

          {isApproved ? (
            <div className="rounded-[28px] bg-white p-5 shadow-card ring-1 ring-line/70">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary-600">
                  <UserRound className="h-4 w-4" />
                </span>
                <p className="text-sm font-bold text-ink-900">{t('shareTitle')}</p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{t('shareBody')}</p>

              <div className="mt-4 space-y-2">
                {patient && patientUser ? (
                  <Button
                    type="button"
                    variant="violet"
                    size="md"
                    className="w-full"
                    onClick={linkKnownPatient}
                    disabled={busy}
                  >
                    <Link2 className="h-4 w-4" />
                    {t('shareKnown', { name: patientUser.fullName })}
                  </Button>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setMode('scan');
                      setError(null);
                    }}
                    disabled={busy}
                  >
                    <Camera className="h-4 w-4" />
                    {t('scanQr')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setMode('code');
                      setError(null);
                    }}
                    disabled={busy}
                  >
                    <KeyRound className="h-4 w-4" />
                    {t('enterCode')}
                  </Button>
                </div>
                {consultation.claimCode && !consultation.claimCode.usedAt ? (
                  <Button
                    type="button"
                    variant="soft"
                    size="md"
                    className="w-full"
                    onClick={() => setMode('claim')}
                  >
                    <QrCode className="h-4 w-4" />
                    {t('claimReady')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="soft"
                    size="md"
                    className="w-full"
                    onClick={handleGenerateClaim}
                    disabled={busy}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    {t('generateClaim')}
                  </Button>
                )}
              </div>

              <p className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-ink-400">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                {t('demoNotice')}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
