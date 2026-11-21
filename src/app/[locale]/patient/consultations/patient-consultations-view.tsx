'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EyeOff, QrCode, ScanLine, Search } from 'lucide-react';
import { getConsultationViewsByPatient } from '@/lib/demo/repository';
import { useDemoSnapshot } from '@/lib/demo/use-demo';
import { PageHeader } from '@/components/shared/page-header';
import { ConsultationCard } from '@/components/shared/consultation-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { cn, formatMonth } from '@/lib/utils';
import type { DemoConsultationView } from '@/lib/demo/types';

const PAGE_SIZE = 20;
type Period = 'all' | 'month' | 'year';

export function PatientConsultationsView(props: {
  userId: string;
  patientId: string;
}) {
  const { patientId } = props;
  const db = useDemoSnapshot();
  const locale = useLocale();
  const t = useTranslations('patient.consultations');
  const tc = useTranslations('common');

  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [doctorId, setDoctorId] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [page, setPage] = useState(1);

  const allViews = useMemo(
    () => (patientId ? getConsultationViewsByPatient(patientId, true) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, patientId],
  );

  const doctors = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const view of allViews) {
      if (!seen.has(view.doctor.id)) {
        seen.set(view.doctor.id, { id: view.doctor.id, name: view.doctorUser.fullName });
      }
    }
    return Array.from(seen.values());
  }, [allViews]);

  const items = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    return allViews.filter((view) => {
      if (!showHidden && view.consultation.hiddenByPatient) return false;
      if (doctorId && view.doctor.id !== doctorId) return false;
      if (period !== 'all') {
        const date = new Date(view.consultation.consultedAt);
        if (period === 'month' && date < monthStart) return false;
        if (period === 'year' && date < yearStart) return false;
      }
      if (needle) {
        const haystack = [
          view.consultation.reason,
          view.consultation.diagnosis ?? '',
          view.doctorUser.fullName,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [allViews, query, period, doctorId, showHidden]);

  const total = items.length;
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const groups = useMemo(() => {
    const map = new Map<string, DemoConsultationView[]>();
    for (const item of pageItems) {
      const date = new Date(item.consultation.consultedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [pageItems]);

  const filtered = Boolean(query || period !== 'all' || doctorId);
  const tabs: Array<{ label: string; value: Period; active: boolean }> = [
    { label: t('filterAll'), value: 'all', active: period === 'all' },
    { label: t('filterThisMonth'), value: 'month', active: period === 'month' },
    { label: t('filterThisYear'), value: 'year', active: period === 'year' },
  ];

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <>
            <Link href={`/${locale}/patient/qr`} className="btn-violet h-10 px-4 text-xs">
              <QrCode className="h-4 w-4" />
              {t('showQr')}
            </Link>
            <Link href={`/${locale}/patient/claim`} className="btn-outline h-10 px-4 text-xs">
              <ScanLine className="h-4 w-4" />
              {t('addByCode')}
            </Link>
          </>
        }
      />

      <div className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-line/70 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-primary-50 px-2 ps-4 ring-1 ring-primary-100/70 transition-all focus-within:bg-white focus-within:ring-primary-300">
            <Search className="h-4 w-4 shrink-0 text-ink-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPage();
              }}
              placeholder={t('searchPlaceholder')}
              className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={doctorId}
              onChange={(event) => {
                setDoctorId(event.target.value);
                resetPage();
              }}
              className="h-11 max-w-[220px] rounded-full border-0 bg-primary-50 px-4 text-xs font-semibold text-primary-700 outline-none ring-1 ring-primary-100/70 focus:ring-primary-300"
            >
              <option value="">{t('filterByDoctor')}</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowHidden((value) => !value);
              resetPage();
            }}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors',
              showHidden
                ? 'bg-ink-900 text-white'
                : 'bg-primary-50 text-ink-500 hover:bg-primary-100 hover:text-primary-700',
            )}
          >
            <EyeOff className="h-3.5 w-3.5" />
            {t('showHidden')}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label={t('title')} className="hide-scrollbar flex items-center gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={tab.active}
                onClick={() => {
                  setPeriod(tab.value);
                  resetPage();
                }}
                className={cn(
                  'pill shrink-0 px-4 py-2 text-xs',
                  tab.active
                    ? 'bg-primary-600 text-white shadow-soft'
                    : 'bg-primary-50 text-ink-500 hover:bg-primary-100 hover:text-primary-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-primary-50 px-3 py-1.5 text-[11px] font-semibold text-ink-500">
            {t('count', { count: total })}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-7">
        {groups.length > 0 ? (
          groups.map(([key, list]) => (
            <section key={key}>
              <div className="mb-3 flex items-center gap-3 px-1">
                <span className="h-2.5 w-2.5 rounded-full bg-primary-600 ring-4 ring-primary-100" />
                <h2 className="text-sm font-bold capitalize text-ink-900">
                  {formatMonth(list[0].consultation.consultedAt, locale)}
                </h2>
                <span className="h-px flex-1 bg-line" />
                <Badge variant="gray">{list.length}</Badge>
              </div>
              <div className="ms-[5px] space-y-2.5 border-s border-primary-100 ps-4 sm:ps-5">
                {list.map((item) => (
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
            </section>
          ))
        ) : (
          <EmptyState
            icon={<ScanLine />}
            title={filtered ? t('emptyFiltered') : t('emptyTitle')}
            body={filtered ? t('emptyFilteredBody') : t('emptyBody')}
            action={
              filtered ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setPeriod('all');
                    setDoctorId('');
                    resetPage();
                  }}
                  className="btn-outline"
                >
                  {t('filterAll')}
                </button>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href={`/${locale}/patient/qr`} className="btn-violet">
                    <QrCode className="h-4 w-4" />
                    {t('showQr')}
                  </Link>
                  <Link href={`/${locale}/patient/claim`} className="btn-outline">
                    <ScanLine className="h-4 w-4" />
                    {t('addByCode')}
                  </Link>
                </div>
              )
            }
          />
        )}
      </div>

      {total > PAGE_SIZE ? (
        <div className="mt-7 flex items-center justify-center gap-2">
          {page > 1 ? (
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="btn-outline h-9 px-4 text-xs"
            >
              {tc('back')}
            </button>
          ) : null}
          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-500 ring-1 ring-line">
            {tc('page')} {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          {page < Math.ceil(total / PAGE_SIZE) ? (
            <button
              type="button"
              onClick={() => setPage((value) => value + 1)}
              className="btn-outline h-9 px-4 text-xs"
            >
              {tc('showMore')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
