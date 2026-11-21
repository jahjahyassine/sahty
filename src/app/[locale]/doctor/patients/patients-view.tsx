'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Camera,
  Check,
  Clock3,
  FolderOpen,
  KeyRound,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { QRScanner } from '@/components/shared/qr-scanner';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Label } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DemoRepositoryError,
  getGrantsForDoctor,
  redeemPatientQr,
} from '@/lib/demo/repository';
import { useDemoSessionUser, useDemoSnapshot } from '@/lib/demo/use-demo';
import { formatDateTime } from '@/lib/utils';

export function PatientsView({ userId, doctorId }: { userId: string; doctorId: string }) {
  const t = useTranslations('doctor.patients');
  const tnew = useTranslations('doctor.new');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const db = useDemoSnapshot();
  const { doctor: sessionDoctor } = useDemoSessionUser(userId);
  const activeDoctorId = doctorId || sessionDoctor?.id || '';

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'scan' | 'code'>('scan');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // `db` est une dépendance volontaire pour recharger les grants du repository.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => getGrantsForDoctor(activeDoctorId), [db, activeDoctorId]);
  const active = items.filter((item) => item.active);
  const expired = items.filter((item) => !item.active);

  function redeem(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setError(null);
    try {
      const result = redeemPatientQr(activeDoctorId, value);
      setOpen(false);
      toast.success(t('viewDossier'));
      router.push(`/${locale}/doctor/patients/${result.patient.id}`);
    } catch (err) {
      if (err instanceof DemoRepositoryError) {
        setError(
          err.code === 'LINK_INVALID' || err.code === 'NOT_FOUND'
            ? te(err.code)
            : te('GENERIC'),
        );
      } else {
        setError(t('openError'));
      }
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setError(null);
              setCode('');
            }}
            className="btn inline-flex items-center gap-2 bg-ink-900 px-5 py-3 text-xs font-bold text-white shadow-pill hover:bg-ink-700"
          >
            <FolderOpen className="h-4 w-4" />
            {t('open')}
          </button>
        }
      />

      <p className="mb-4 flex items-center gap-2 rounded-2xl bg-primary-50/70 px-4 py-2.5 text-[11px] text-ink-500">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary-500" />
        {t('demoNote')}
      </p>

      <div className="grid gap-5">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">
              {t('activeSection')}
            </h2>
            <Badge variant="violet">{active.length}</Badge>
          </div>
          {active.length === 0 ? (
            <div className="rounded-3xl bg-white ring-1 ring-line/70">
              <EmptyState
                icon={<Users className="h-6 w-6 text-primary-500" />}
                title={t('emptyTitle')}
                body={t('emptyBody')}
              />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {active.map((grant) => (
                <button
                  key={grant.grant.id}
                  type="button"
                  onClick={() => router.push(`/${locale}/doctor/patients/${grant.patient.id}`)}
                  className="group rounded-3xl bg-white p-5 text-start shadow-card ring-1 ring-line/70 transition-all hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={grant.patientUser.fullName} tone="violet" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink-900 group-hover:text-primary-700">
                        {grant.patientUser.fullName}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[10px] tabular-nums text-ink-400">
                        <Clock3 className="h-3 w-3" />
                        {t('expiresAt', { date: formatDateTime(grant.grant.expiresAt, locale) })}
                      </p>
                    </div>
                    <Badge variant={grant.grant.scope === 'FULL' ? 'peach' : 'violet'}>
                      {grant.grant.scope === 'FULL' ? t('scopeFull') : t('scopeVitals')}
                    </Badge>
                  </div>
                  <p className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-primary-600">
                    {t('viewDossier')}
                    <Check className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {expired.length > 0 ? (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">
                {t('recentSection')}
              </h2>
              <Badge variant="gray">{expired.length}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {expired.map((grant) => (
                <div
                  key={grant.grant.id}
                  className="rounded-3xl bg-ink-50/60 p-5 ring-1 ring-line/70 opacity-75"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={grant.patientUser.fullName} tone="soft" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-500">
                        {grant.patientUser.fullName}
                      </p>
                      <p className="mt-1 text-[10px] text-ink-400">
                        {t('expiresAt', { date: formatDateTime(grant.grant.expiresAt, locale) })}
                      </p>
                    </div>
                    <Badge variant="gray">{t('expiredLabel')}</Badge>
                  </div>
                  <p className="mt-3 text-[10px] leading-relaxed text-ink-400">{t('reapplyHint')}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('open')}</DialogTitle>
            <DialogDescription>{t('subtitle')}</DialogDescription>
          </DialogHeader>

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
                hint={tnew('scanInstruction')}
                className="mx-auto w-full"
              />
              <p className="mt-3 rounded-2xl bg-primary-50/70 px-4 py-3 text-center text-[11px] leading-relaxed text-ink-500">
                {tnew('scanInstruction')}
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
              <button
                type="submit"
                disabled={!code.trim()}
                className="btn mt-5 w-full justify-center bg-primary-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {t('openCta')}
              </button>
              <p className="mt-2 text-center text-[10px] leading-relaxed text-ink-400">
                {tnew('codeInstruction')}
              </p>
            </form>
          )}

          {error ? (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#FDECEC] px-4 py-3 text-[11px] font-medium text-danger">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
