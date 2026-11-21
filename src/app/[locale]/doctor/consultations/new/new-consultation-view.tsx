'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  Loader2,
  QrCode,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { QRScanner } from '@/components/shared/qr-scanner';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import {
  createConsultation,
  DemoRepositoryError,
  getPatientById,
  redeemPatientQr,
} from '@/lib/demo/repository';
import { useDemoSnapshot, useDemoSessionUser } from '@/lib/demo/use-demo';
import type { DemoPatient } from '@/lib/demo/types';

export function NewConsultationView({
  userId,
  doctorId,
  patientId = '',
  patientName = '',
}: {
  userId: string;
  doctorId: string;
  patientId?: string;
  patientName?: string;
}) {
  const tform = useTranslations('doctor.form');
  const t = useTranslations('doctor.new');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const db = useDemoSnapshot();
  const { doctor: sessionDoctor } = useDemoSessionUser(userId);
  const activeDoctorId = doctorId || sessionDoctor?.id || '';

  const preselected = useMemo(
    () => (patientId ? getPatientById(patientId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, patientId],
  );
  const [selected, setSelected] = useState<DemoPatient | null>(preselected);
  const [tab, setTab] = useState<'scan' | 'code'>('scan');
  const [code, setCode] = useState('');
  const [reason, setReason] = useState('');
  const [freeReason, setFreeReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedUser = selected ? db.users.find((item) => item.id === selected.userId) : null;
  const displayName = selectedUser?.fullName || patientName;

  function errorMessage(err: unknown, fallback: string) {
    if (!(err instanceof DemoRepositoryError)) return fallback;
    if (err.code === 'LINK_INVALID' || err.code === 'NOT_FOUND') return te(err.code);
    return fallback;
  }

  function redeem(raw: string) {
    const value = raw.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = redeemPatientQr(activeDoctorId, value);
      setSelected(result.patient);
      setNotice(result.grant && result.scope !== 'LINK_ONLY' ? t('accessGranted') : null);
    } catch (err) {
      setError(errorMessage(err, t('invalid')));
    } finally {
      setBusy(false);
    }
  }

  function start() {
    if (!selected || !reason.trim()) {
      setError(tform('requiredFields'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const consultation = createConsultation({
        doctorId: activeDoctorId,
        patientId: selected.id,
        reason,
      });
      router.push(`/${locale}/doctor/consultations/${consultation.id}`);
    } catch (err) {
      setError(errorMessage(err, t('error')));
      setBusy(false);
    }
  }

  function startFree() {
    if (!freeReason.trim()) {
      setError(tform('requiredFields'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const consultation = createConsultation({
        doctorId: activeDoctorId,
        patientId: null,
        reason: freeReason,
      });
      router.push(`/${locale}/doctor/consultations/${consultation.id}`);
    } catch (err) {
      setError(errorMessage(err, t('error')));
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={tform('newTitle')}
        subtitle={tform('newSubtitle')}
        actions={
          <Link href={`/${locale}/doctor`} className="btn-outline h-10 px-4 text-xs">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t('back')}
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
            <div className="flex items-center gap-1 rounded-full bg-primary-50 p-1">
              <button
                type="button"
                onClick={() => setTab('scan')}
                className={
                  tab === 'scan'
                    ? 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-primary-700 shadow-sm'
                    : 'inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-ink-500'
                }
              >
                <Camera className="h-3.5 w-3.5" />
                {t('scanTab')}
              </button>
              <button
                type="button"
                onClick={() => setTab('code')}
                className={
                  tab === 'code'
                    ? 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-primary-700 shadow-sm'
                    : 'inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-ink-500'
                }
              >
                <KeyRound className="h-3.5 w-3.5" />
                {t('codeTab')}
              </button>
            </div>

            {tab === 'scan' ? (
              <div className="mt-4">
                <QRScanner
                  onResult={(raw) => redeem(raw)}
                  paused={busy}
                  hint={t('scanInstruction')}
                  className="mx-auto w-full"
                />
                <p className="mt-3 rounded-2xl bg-primary-50/70 px-4 py-3 text-center text-[11px] leading-relaxed text-ink-500">
                  {t('scanInstruction')}
                </p>
              </div>
            ) : (
              <form
                className="mt-5 flex flex-col items-center"
                onSubmit={(event) => {
                  event.preventDefault();
                  redeem(code);
                }}
              >
                <Label htmlFor="patient-code" className="w-full text-center">
                  {t('codeTab')}
                </Label>
                <Input
                  id="patient-code"
                  dir="ltr"
                  autoFocus
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="SH-482913"
                  className="ltr-code mt-2 text-center"
                />
                <Button type="submit" variant="violet" size="md" disabled={busy || !code.trim()} className="mt-4 w-full justify-center">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {t('open')}
                </Button>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-400">
                  {t('codeInstruction')}
                </p>
              </form>
            )}

            {notice ? (
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[#E9F6F1] px-4 py-3 text-[11px] font-medium text-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {notice}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[#FDECEC] px-4 py-3 text-[11px] font-medium text-danger">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : null}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary-500" />
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
                {t('demoPatients')}
              </h2>
            </div>
            <div className="mt-3 space-y-2">
              {db.patients.map((patient) => {
                const user = db.users.find((item) => item.id === patient.userId);
                const active = selected?.id === patient.id;
                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => {
                      setSelected(patient);
                      setNotice(null);
                      setError(null);
                    }}
                    className={
                      active
                        ? 'flex w-full items-center gap-3 rounded-2xl bg-primary-100/70 p-3 text-start ring-1 ring-primary-200'
                        : 'flex w-full items-center gap-3 rounded-2xl bg-primary-50/50 p-3 text-start ring-1 ring-line/60 transition-colors hover:bg-primary-50'
                    }
                  >
                    <Avatar name={user?.fullName ?? patient.patientCode} size="sm" tone="soft" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-ink-900">
                        {user?.fullName ?? patient.patientCode}
                      </span>
                      <span className="ltr-code block text-[10px] text-ink-400">{patient.patientCode}</span>
                    </span>
                    {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-600" /> : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-ink-400">{t('demoHint')}</p>
          </section>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
            {selected && displayName ? (
              <>
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary-50/70 p-4">
                  <Avatar name={displayName} size="md" tone="violet" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {displayName}
                    </p>
                    <p className="ltr-code mt-0.5 text-[10px] text-ink-400">{selected.patientCode}</p>
                  </div>
                  <Badge variant="green">{t('patientReady')}</Badge>
                </div>

                <div className="mt-5">
                  <Label htmlFor="reason">{t('reasonLabel')}</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t('reasonPlaceholder')}
                  />
                </div>

                <Button
                  type="button"
                  variant="violet"
                  size="lg"
                  disabled={busy || !reason.trim()}
                  onClick={start}
                  className="mt-5 w-full justify-center"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                  {busy ? t('starting') : t('start')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </>
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <span className="grid h-16 w-16 place-items-center rounded-3xl bg-primary-50 text-primary-500">
                  <QrCode className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-base font-bold text-ink-900">{t('title')}</h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-500">{t('subtitle')}</p>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FDF4DE] text-[#C2912A]">
                <ClipboardList className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold">{t('freeTitle')}</h2>
                <p className="mt-0.5 text-[11px] text-ink-400">{t('freeBody')}</p>
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="free-reason">{t('freeReason')}</Label>
              <Input
                id="free-reason"
                value={freeReason}
                onChange={(event) => setFreeReason(event.target.value)}
                placeholder={t('reasonPlaceholder')}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={busy || !freeReason.trim()}
              onClick={startFree}
              className="mt-4 w-full justify-center"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              {t('freeStart')}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
