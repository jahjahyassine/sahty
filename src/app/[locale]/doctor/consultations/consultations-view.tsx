'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  CalendarPlus,
  ClipboardList,
  FileClock,
  FileText,
  Paperclip,
  Pill,
  Search,
  Stethoscope,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { PillTabs } from '@/components/ui/pill-tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { useDemoSnapshot } from '@/lib/demo/use-demo';
import type { ConsultationStatus } from '@/lib/demo/types';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 20;
const STATUSES: ConsultationStatus[] = ['DRAFT', 'COMPLETED', 'LINKED'];

export function ConsultationsView({
  userId,
  doctorId,
  query = '',
  status = '',
  page = '1',
}: {
  userId: string;
  doctorId: string;
  query?: string;
  status?: string;
  page?: string;
}) {
  const t = useTranslations('doctor.consultations');
  const tc = useTranslations('common');
  const locale = useLocale();
  const db = useDemoSnapshot();

  const search = query.trim();
  const activeStatus = STATUSES.includes(status as ConsultationStatus)
    ? (status as ConsultationStatus)
    : '';
  const currentPage = Math.max(1, Number(page) || 1);
  const base = `/${locale}/doctor/consultations`;

  const data = useMemo(() => {
    const all = db.consultations
      .filter((item) => item.doctorId === doctorId)
      .sort((a, b) => new Date(b.consultedAt).getTime() - new Date(a.consultedAt).getTime());
    const counts: Record<ConsultationStatus, number> = { DRAFT: 0, COMPLETED: 0, LINKED: 0 };
    for (const item of all) counts[item.status] += 1;
    return { all, counts };
  }, [db, doctorId]);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return data.all.filter((item) => {
      if (activeStatus && item.status !== activeStatus) return false;
      if (!needle) return true;
      const patient = item.patientId ? db.patients.find((p) => p.id === item.patientId) : null;
      const patientName = patient
        ? db.users.find((u) => u.id === patient.userId)?.fullName ?? ''
        : '';
      return (
        item.reason.toLowerCase().includes(needle) ||
        (item.diagnosis ?? '').toLowerCase().includes(needle) ||
        patientName.toLowerCase().includes(needle)
      );
    });
  }, [data.all, db, search, activeStatus]);

  const total = filtered.length;
  const items = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function buildHref(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (search) params.set('query', search);
    if (activeStatus) params.set('status', activeStatus);
    if (currentPage > 1) params.set('page', String(currentPage));
    for (const [key, value] of Object.entries(patch)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  function actionFor(item: (typeof items)[number]) {
    if (item.status === 'DRAFT') {
      return { href: `/${locale}/doctor/consultations/${item.id}`, label: t('continue') };
    }
    if (item.status === 'COMPLETED') {
      return { href: `/${locale}/doctor/consultations/${item.id}/finish`, label: t('link') };
    }
    return { href: `/${locale}/doctor/consultations/${item.id}`, label: t('view') };
  }

  const tabs = [
    {
      label: `${t('filterAll')} · ${data.all.length}`,
      href: buildHref({ status: undefined, page: undefined }),
      active: !activeStatus,
    },
    {
      label: `${t('filterDraft')} · ${data.counts.DRAFT}`,
      href: buildHref({ status: 'DRAFT', page: undefined }),
      active: activeStatus === 'DRAFT',
    },
    {
      label: `${t('filterCompleted')} · ${data.counts.COMPLETED}`,
      href: buildHref({ status: 'COMPLETED', page: undefined }),
      active: activeStatus === 'COMPLETED',
    },
    {
      label: `${t('filterLinked')} · ${data.counts.LINKED}`,
      href: buildHref({ status: 'LINKED', page: undefined }),
      active: activeStatus === 'LINKED',
    },
  ];

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Link href={`/${locale}/doctor/consultations/new`} className="btn-violet h-10 px-4 text-xs">
            <CalendarPlus className="h-4 w-4" />
            {t('new')}
          </Link>
        }
      />

      <div className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form
            action={base}
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-primary-50 px-2 ps-4 ring-1 ring-primary-100/70 transition-all focus-within:bg-white focus-within:ring-primary-300"
          >
            <Search className="h-4 w-4 shrink-0 text-ink-400" />
            <input
              name="query"
              defaultValue={search}
              placeholder={t('searchPlaceholder')}
              className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-400"
            />
            {activeStatus ? <input type="hidden" name="status" value={activeStatus} /> : null}
            <button
              type="submit"
              className="h-8 rounded-full bg-white px-3 text-[11px] font-semibold text-primary-700 shadow-sm hover:bg-primary-100"
            >
              {tc('search')}
            </button>
          </form>

          <span className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full bg-primary-50 px-3.5 text-[11px] font-semibold text-ink-500 lg:self-auto">
            <ClipboardList className="h-3.5 w-3.5 text-primary-500" />
            {t('resultsCount', { count: total })}
          </span>
        </div>

        <div className="mt-3">
          <PillTabs items={tabs} ariaLabel={t('title')} />
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-4">
          <div className="hidden grid-cols-[108px_1.1fr_1.5fr_110px_150px] items-center gap-3 px-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400 md:grid">
            <span>{t('columns.date')}</span>
            <span>{t('columns.patient')}</span>
            <span>{t('columns.reason')}</span>
            <span>{t('columns.status')}</span>
            <span className="text-end">{t('columns.actions')}</span>
          </div>

          <div className="space-y-2">
            {items.map((item) => {
              const action = actionFor(item);
              const patient = item.patientId
                ? db.patients.find((p) => p.id === item.patientId)
                : null;
              const patientName = patient
                ? db.users.find((u) => u.id === patient.userId)?.fullName ?? null
                : null;
              return (
                <div
                  key={item.id}
                  className="rounded-3xl bg-white p-4 ring-1 ring-line/70 transition-all duration-200 hover:shadow-soft md:grid md:grid-cols-[108px_1.1fr_1.5fr_110px_150px] md:items-center md:gap-3 md:px-5"
                >
                  <div className="flex items-center gap-3 md:block">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-700 ring-1 ring-primary-100/60 md:hidden">
                      <span className="text-sm font-bold leading-none">
                        {formatDate(item.consultedAt, locale, { day: '2-digit' })}
                      </span>
                    </span>
                    <div>
                      <p className="text-xs font-bold text-ink-900">
                        {formatDate(item.consultedAt, locale, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-400">
                        {formatDate(item.consultedAt, locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 min-w-0 md:mt-0">
                    {patientName ? (
                      <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-ink-700">
                        <Stethoscope className="h-3 w-3 shrink-0 text-ink-300" />
                        {patientName}
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium text-ink-400">{t('notLinked')}</p>
                    )}
                    {patient?.patientCode ? (
                      <p className="ltr-code mt-0.5 text-[10px] text-ink-300">{patient.patientCode}</p>
                    ) : null}
                  </div>

                  <div className="mt-2 min-w-0 md:mt-0">
                    <p className="truncate text-sm font-bold text-ink-900">{item.reason || '—'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {item.diagnosis ? (
                        <p className="line-clamp-1 text-[10px] text-ink-400">{item.diagnosis}</p>
                      ) : null}
                      {item.attachments.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[9px] font-semibold text-ink-500">
                          <Paperclip className="h-2.5 w-2.5" />
                          {item.attachments.length}
                        </span>
                      ) : null}
                      {item.prescriptions.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F6F1] px-2 py-0.5 text-[9px] font-semibold text-success">
                          <Pill className="h-2.5 w-2.5" />
                          {item.prescriptions.length}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2.5 md:mt-0">
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 md:mt-0 md:justify-end">
                    <Link
                      href={action.href}
                      className={
                        item.status === 'COMPLETED'
                          ? 'inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-900 px-4 text-[11px] font-semibold text-white shadow-pill transition-colors hover:bg-ink-700'
                          : 'inline-flex h-9 items-center gap-1.5 rounded-full bg-primary-50 px-4 text-[11px] font-semibold text-primary-700 transition-colors hover:bg-primary-100'
                      }
                    >
                      {item.status === 'DRAFT' ? <FileClock className="h-3.5 w-3.5" /> : null}
                      {item.status === 'COMPLETED' ? <FileText className="h-3.5 w-3.5" /> : null}
                      {action.label}
                      <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={<ClipboardList />}
            title={search || activeStatus ? tc('noResults') : t('emptyTitle')}
            body={t('emptyBody')}
            action={
              search || activeStatus ? (
                <Link href={base} className="btn-outline">
                  {t('filterAll')}
                </Link>
              ) : (
                <Link href={`/${locale}/doctor/consultations/new`} className="btn-violet">
                  <CalendarPlus className="h-4 w-4" />
                  {t('new')}
                </Link>
              )
            }
          />
        </div>
      )}

      {total > PAGE_SIZE ? (
        <div className="mt-7 flex items-center justify-center gap-2">
          {currentPage > 1 ? (
            <Link href={buildHref({ page: String(currentPage - 1) })} className="btn-outline h-9 px-4 text-xs">
              {tc('back')}
            </Link>
          ) : null}
          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-500 ring-1 ring-line">
            {tc('page')} {currentPage} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          {currentPage < Math.ceil(total / PAGE_SIZE) ? (
            <Link href={buildHref({ page: String(currentPage + 1) })} className="btn-outline h-9 px-4 text-xs">
              {tc('showMore')}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
