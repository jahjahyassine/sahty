'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Check,
  Eye,
  FileDown,
  Link2,
  Loader2,
  ShieldCheck,
  ShieldOff,
  ShieldQuestion,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import {
  DemoRepositoryError,
  getAccessLog,
  getGrantsForPatient,
  revokeGrant,
} from '@/lib/demo/repository';
import { useDemoSnapshot } from '@/lib/demo/use-demo';
import type { DemoGrantView } from '@/lib/demo/types';
import { formatDateTime } from '@/lib/utils';

type LogEntry = {
  id: string;
  action: string;
  createdAt: string;
  actorName: string | null;
  specialty: string | null;
  section: string | null;
  scope: string | null;
};

export function AccessView(props: {
  userId: string;
  patientId: string;
}) {
  const { patientId } = props;
  const t = useTranslations('patient.access');
  const tc = useTranslations('common');
  const locale = useLocale();
  const db = useDemoSnapshot();

  const grants = useMemo(
    () => (patientId ? getGrantsForPatient(patientId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, patientId],
  );
  const log = useMemo<LogEntry[]>(
    () => (patientId ? getAccessLog(patientId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, patientId],
  );

  const [target, setTarget] = useState<DemoGrantView | null>(null);
  const [revoking, setRevoking] = useState(false);

  const active = grants.filter((grant) => grant.active);
  const inactive = grants.filter((grant) => !grant.active);

  function confirmRevoke() {
    if (!target) return;
    setRevoking(true);
    try {
      revokeGrant(patientId, target.grant.id);
      toast.success(t('revokeSuccess', { doctor: target.doctorUser.fullName }));
      setTarget(null);
    } catch (error) {
      const message = error instanceof DemoRepositoryError ? error.message : tc('error');
      toast.error(message || tc('error'));
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

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
                icon={<ShieldCheck className="h-6 w-6 text-primary-500" />}
                title={t('emptyActiveTitle')}
                body={t('emptyActiveBody')}
                action={
                  <Link
                    href={`/${locale}/patient/qr`}
                    className="btn inline-flex items-center gap-2 bg-ink-900 px-5 py-2.5 text-xs font-bold text-white"
                  >
                    {t('shareNow')}
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {active.map((grantView) => (
                <div
                  key={grantView.grant.id}
                  className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={grantView.doctorUser.fullName} tone="violet" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink-900">{grantView.doctorUser.fullName}</p>
                      <p className="truncate text-[11px] text-ink-400">{grantView.doctor.specialty}</p>
                    </div>
                    <Badge variant={grantView.grant.scope === 'FULL' ? 'peach' : 'violet'}>
                      {grantView.grant.scope === 'FULL' ? t('scopeFull') : t('scopeVitals')}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-1.5 text-[11px] text-ink-500">
                    <p>{t('expiresAt', { date: formatDateTime(grantView.grant.expiresAt, locale) })}</p>
                    {grantView.grant.lastAccessAt ? (
                      <p>{t('lastAccess', { date: formatDateTime(grantView.grant.lastAccessAt, locale) })}</p>
                    ) : null}
                    <p>{t('accessCount', { count: grantView.grant.accessCount })}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTarget(grantView)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-danger px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-[#d94f56]"
                  >
                    <ShieldOff className="h-3.5 w-3.5" />
                    {t('revoke')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {inactive.length > 0 ? (
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">
              {t('historySection')}
            </h2>
            <div className="divide-y divide-line rounded-3xl bg-white px-5 shadow-card ring-1 ring-line/70">
              {inactive.map((grantView) => (
                <div key={grantView.grant.id} className="flex flex-wrap items-center gap-3 py-3.5">
                  <Avatar name={grantView.doctorUser.fullName} tone="violet" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink-900">{grantView.doctorUser.fullName}</p>
                    <p className="mt-0.5 text-[10px] text-ink-400">
                      {t('expiresAt', { date: formatDateTime(grantView.grant.expiresAt, locale) })}
                    </p>
                  </div>
                  <Badge variant={grantView.grant.revokedAt ? 'red' : 'gray'} size="sm">
                    {grantView.grant.revokedAt ? t('logRevoked') : tc('expired')}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">
            {inactive.length > 0 ? tc('details') : t('historySection')}
          </h2>

          {log.length === 0 ? (
            <div className="rounded-3xl bg-white ring-1 ring-line/70">
              <EmptyState
                icon={<ShieldQuestion className="h-6 w-6 text-ink-300" />}
                title={t('emptyHistoryTitle')}
                body={t('emptyHistoryBody')}
              />
            </div>
          ) : (
            <ol className="relative space-y-0 rounded-3xl bg-white p-5 ring-1 ring-line/70">
              <span
                aria-hidden="true"
                className="absolute bottom-6 start-[2.05rem] top-6 w-px bg-line"
              />
              {log.map((entry) => {
                const view = viewFor(entry, t);
                return (
                  <li key={entry.id} className="relative flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                      {view.icon}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-xs font-semibold leading-snug text-ink-900">
                        <span className="font-bold">{entry.actorName ?? '—'}</span> {view.text}
                      </p>
                      <p className="mt-0.5 text-[10px] tabular-nums text-ink-400">
                        {formatDateTime(entry.createdAt, locale)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('revokeConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {target ? t('revokeConfirmBody', { doctor: target.doctorUser.fullName }) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className="btn-outline" onClick={() => setTarget(null)}>
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={confirmRevoke}
              disabled={revoking}
              className="btn bg-danger text-white hover:bg-[#d94f56]"
            >
              {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
              {t('revokeConfirmAction')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function viewFor(
  entry: LogEntry,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  const sectionLabel =
    entry.section === 'summary'
      ? t('sectionVitals')
      : entry.section === 'history'
        ? t('sectionHistory')
        : entry.section === 'consultation'
          ? t('sectionConsultation')
          : '';
  const scopeLabel = entry.scope === 'FULL' ? t('scopeFull') : t('scopeVitals');

  switch (entry.action) {
    case 'ACCESS_GRANTED':
      return { icon: <ShieldCheck className="h-4 w-4" />, text: t('logGranted', { scope: scopeLabel }) };
    case 'PATIENT_FILE_VIEWED':
      return { icon: <Eye className="h-4 w-4" />, text: t('logViewed', { section: sectionLabel }) };
    case 'FILE_DOWNLOADED':
      return { icon: <FileDown className="h-4 w-4" />, text: t('logDownloaded') };
    case 'ACCESS_REVOKED':
      return { icon: <ShieldOff className="h-4 w-4" />, text: t('logRevoked') };
    case 'LINK_VIA_GRANT':
      return { icon: <Link2 className="h-4 w-4" />, text: t('logLinked') };
    default:
      return { icon: <Check className="h-4 w-4" />, text: entry.action };
  }
}
