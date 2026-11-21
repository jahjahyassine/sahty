'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  KeyRound,
  Loader2,
  ScanLine,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
import { QRScanner } from '@/components/shared/qr-scanner';
import { CodeInput } from '@/components/ui/code-input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  DemoRepositoryError,
  claimConsultation,
  getClaimPreview,
  type ClaimPreview,
} from '@/lib/demo/repository';
import { useDemoSessionUser } from '@/lib/demo/use-demo';
import { PageHeader } from '@/components/shared/page-header';
import { extractClaimCode } from '@/lib/demo/codes';
import { formatDate, formatDateTime, cn } from '@/lib/utils';

type Tab = 'scan' | 'code';
type Step = 'input' | 'preview' | 'success';
type Preview = ClaimPreview & { code: string };

export function ClaimFlow(props: {
  userId: string;
  patientId: string;
}) {
  const { userId } = props;
  const { patient } = useDemoSessionUser(userId);
  const t = useTranslations('patient.claim');
  const td = useTranslations('patient.dashboard');
  const ta = useTranslations('patient.access');
  const tc = useTranslations('common');
  const locale = useLocale();

  const [tab, setTab] = useState<Tab>('code');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function messageFor(error: unknown) {
    if (error instanceof DemoRepositoryError) {
      if (error.code === 'CLAIM_EXPIRED') return t('expired');
      if (error.code === 'CLAIM_USED') return t('used');
      if (error.code === 'CLAIM_INVALID') return t('invalid');
    }
    return t('invalid');
  }

  function verify(raw: string) {
    const cleaned = extractClaimCode(raw);
    if (!cleaned) {
      setError(t('invalid'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = getClaimPreview(cleaned);
      setCode(cleaned);
      setPreview({ ...result, code: cleaned });
      setStep('preview');
    } catch (err) {
      const message = messageFor(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function confirm() {
    if (!patient) {
      toast.error(tc('error'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const consultation = claimConsultation(patient.id, code);
      setSuccessId(consultation.id);
      setStep('success');
      toast.success(t('successTitle'));
    } catch (err) {
      const message = messageFor(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep('input');
    setPreview(null);
    setCode('');
    setError(null);
    setSuccessId(null);
    setTab('code');
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="rounded-[30px] bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-6">
            {step === 'input' ? (
              <>
                <div className="flex gap-2 rounded-full bg-primary-50 p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('scan');
                      setError(null);
                    }}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-semibold transition-all',
                      tab === 'scan' ? 'bg-white text-primary-700 shadow-sm' : 'text-ink-500 hover:text-primary-600',
                    )}
                  >
                    <ScanLine className="h-4 w-4" />
                    {t('scanTab')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('code');
                      setError(null);
                    }}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-semibold transition-all',
                      tab === 'code' ? 'bg-white text-primary-700 shadow-sm' : 'text-ink-500 hover:text-primary-600',
                    )}
                  >
                    <KeyRound className="h-4 w-4" />
                    {t('codeTab')}
                  </button>
                </div>

                {tab === 'scan' ? (
                  <div className="mt-4">
                    <QRScanner
                      onResult={(raw) => {
                        if (!loading && step === 'input') verify(raw);
                      }}
                      paused={loading}
                      hint={t('scanInstruction')}
                      className="w-full"
                    />
                    <div className="mt-4 rounded-2xl bg-primary-50/70 p-3.5">
                      <p className="text-xs leading-relaxed text-ink-500">{t('scanInstruction')}</p>
                      <button
                        type="button"
                        onClick={() => setTab('code')}
                        className="mt-2 text-[11px] font-bold text-primary-600 hover:text-primary-800"
                      >
                        {t('codeTab')} →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col items-center">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-100 text-primary-600">
                      <KeyRound className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-bold">{t('codeInstruction')}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{t('helper')}</p>

                    <CodeInput
                      value={code}
                      onChange={(value) => {
                        setCode(value);
                        setError(null);
                      }}
                      onComplete={(value) => {
                        if (!loading) verify(value);
                      }}
                      disabled={loading}
                      autoFocus
                      className="mt-5"
                    />

                    <Button
                      variant="primary"
                      size="lg"
                      className="mt-6 w-full max-w-xs"
                      onClick={() => verify(code)}
                      disabled={loading || code.length < 8}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {loading ? t('verifying') : t('verify')}
                    </Button>
                  </div>
                )}

                {error ? (
                  <div className="mt-4 rounded-2xl bg-[#FDECEC] px-4 py-3 text-xs font-medium text-danger">
                    {error}
                  </div>
                ) : null}

                {loading && tab === 'scan' ? (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-primary-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('verifying')}
                  </div>
                ) : null}
              </>
            ) : null}

            {step === 'preview' && preview ? (
              <div className="animate-pop">
                <div className="flex flex-col items-center text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-100 text-primary-600">
                    <FileText className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-xl font-bold">{t('previewTitle')}</h2>
                  <p className="mt-1.5 max-w-sm text-sm text-ink-500">
                    {t('previewBody', {
                      doctor: preview.doctorUser.fullName,
                      date: formatDate(preview.consultation.consultedAt, locale),
                    })}
                  </p>
                </div>

                <div className="mt-5 rounded-3xl bg-primary-50/70 p-4 ring-1 ring-primary-100/60">
                  <div className="flex items-center gap-3">
                    <Avatar name={preview.doctorUser.fullName} size="lg" tone="peach" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900">{preview.doctorUser.fullName}</p>
                      <p className="text-[11px] text-ink-500">{preview.doctor.specialty}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 border-t border-primary-100 pt-3 text-[11px] text-ink-500">
                    <p className="flex items-center gap-2">
                      <Stethoscope className="h-3.5 w-3.5 text-primary-400" />
                      {preview.consultation.reason}
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-primary-400" />
                      {formatDate(preview.consultation.consultedAt, locale, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary-400" />
                      {ta('expiresAt', { date: formatDateTime(preview.expiresAt, locale) })}
                    </p>
                  </div>
                </div>

                {error ? (
                  <div className="mt-3 rounded-2xl bg-[#FDECEC] px-4 py-3 text-xs font-medium text-danger">{error}</div>
                ) : null}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
                  <Button variant="primary" size="lg" className="flex-1" onClick={confirm} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {loading ? t('confirming') : t('confirmAdd')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="flex-1"
                    onClick={() => {
                      setStep('input');
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    {tc('cancel')}
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 'success' ? (
              <div className="flex flex-col items-center py-8 text-center animate-pop">
                <span className="relative grid h-20 w-20 place-items-center rounded-full bg-[#E9F6F1]">
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[#8FD9BE]/40" />
                  <CheckCircle2 className="relative h-10 w-10 text-success" />
                </span>
                <h2 className="mt-5 text-xl font-bold">{t('successTitle')}</h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">{t('successBody')}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {successId ? (
                    <Link href={`/${locale}/patient/consultations/${successId}`} className="btn-violet">
                      {t('viewConsultation')}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </Link>
                  ) : null}
                  <button type="button" onClick={reset} className="btn-outline">
                    {t('addAnother')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 lg:col-span-5">
          <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-100 text-accent-500">
                <ScanLine className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold">{t('title')}</h3>
            </div>
            <ol className="mt-4 space-y-3">
              {[
                t('subtitle'),
                t('helper'),
                t('successBody'),
              ].map((text, index) => (
                <li key={`${index}-${text}`} className="flex gap-3 text-[11px] leading-relaxed text-ink-500">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
                    {index + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl bg-[#E9F6F1] p-5 ring-1 ring-[#D8F0E7]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <p className="text-xs font-bold text-ink-900">{t('codeTab')}</p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{t('helper')}</p>
          </div>

          <div className="rounded-3xl bg-primary-600 p-5 text-white shadow-soft">
            <p className="text-sm font-bold">{t('scanTab')}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/70">{t('scanInstruction')}</p>
            <Link
              href={`/${locale}/patient/qr`}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white underline-offset-4 hover:underline"
            >
              {td('openQr')}
              <ArrowRight className="h-3 w-3 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
