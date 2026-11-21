'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  CheckCircle2,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { patientQrPayload } from '@/lib/demo/codes';
import { useDemoSessionUser } from '@/lib/demo/use-demo';
import { PageHeader } from '@/components/shared/page-header';
import { QRDisplay } from '@/components/shared/qr-display';
import { EmptyState } from '@/components/ui/empty-state';

export function QrPanel(props: {
  userId: string;
  patientId: string;
}) {
  const { userId } = props;
  const { patient } = useDemoSessionUser(userId);
  const locale = useLocale();
  const t = useTranslations('patient.qr');
  const td = useTranslations('patient.dashboard');
  const tc = useTranslations('common');

  const steps = [
    { icon: QrCode, title: t('showToDoctor'), body: t('instruction') },
    { icon: ScanLine, title: tc('scan'), body: t('scanOrCode') },
    { icon: CheckCircle2, title: t('successTitle'), body: t('demoLinked') },
  ];

  return (
    <div className="animate-fade-up">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {!patient ? (
        <EmptyState icon={<QrCode />} title={t('title')} body={tc('error')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 p-5 text-white shadow-soft sm:p-7">
              <span className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10" />
              <span className="pointer-events-none absolute -bottom-28 -left-16 h-60 w-60 rounded-full bg-accent-400/15 blur-2xl" />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                    {t('title')}
                  </p>
                  <h2 className="mt-1.5 text-xl font-bold sm:text-2xl">{t('showToDoctor')}</h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8CE0C1] opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8CE0C1]" />
                  </span>
                  {t('waitingDemo')}
                </span>
              </div>

              <div className="relative mt-6 flex flex-col items-center">
                <QRDisplay
                  value={patientQrPayload(patient.patientCode)}
                  code={patient.patientCode}
                  size={216}
                  hint={t('demoNote')}
                />
              </div>

              <div className="relative mt-6 flex items-center justify-center gap-2 border-t border-white/15 pt-5 text-center text-[11px] leading-relaxed text-white/70">
                <ShieldCheck className="h-4 w-4 shrink-0 text-accent-300" />
                {t('demoExpires')}
              </div>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-5">
            <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-100 text-primary-600">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold">{td('qrTitle')}</h3>
              </div>
              <ol className="mt-4 space-y-3.5">
                {steps.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600">
                      <step.icon className="h-4 w-4" />
                      <span className="absolute -end-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary-600 text-[8px] font-bold text-white">
                        {index + 1}
                      </span>
                    </span>
                    <div className="pt-0.5">
                      <p className="text-xs font-bold text-ink-900">{step.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-3xl bg-[#E9F6F1] p-5 ring-1 ring-[#D8F0E7]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <p className="text-xs font-bold text-ink-900">{t('scopeLocked')}</p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{t('demoNote')}</p>
            </div>

            <div className="flex items-center justify-between rounded-3xl bg-white p-4 ring-1 ring-line/70">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-100 text-accent-500">
                  <ScanLine className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold text-ink-700">{t('codeLabel')}</p>
              </div>
              <Link
                href={`/${locale}/patient/claim`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:text-primary-800"
              >
                {tc('add')}
                <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
