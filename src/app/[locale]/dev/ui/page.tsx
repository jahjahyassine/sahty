'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  HeartPulse,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { StatCard, HighlightCard, MiniStatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { QRDisplay } from '@/components/shared/qr-display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { IconBubble } from '@/components/ui/icon-bubble';
import { Input, Label, Textarea } from '@/components/ui/input';
import { CodeInput } from '@/components/ui/code-input';
import { EmptyState } from '@/components/ui/empty-state';

function Block({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6 ${className ?? ''}`}>
      <h2 className="eyebrow mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const t = useTranslations('dev');
  const tc = useTranslations('common');
  const [code, setCode] = useState('');

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <LanguageSwitcher />
      </div>

      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="mt-1.5 text-sm text-ink-500">{t('subtitle')}</p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-500">
          {tc('demoMode')} · /dev/ui
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <Block title="Buttons" className="lg:col-span-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="violet">Violet</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="icon">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </Block>

        <Block title="Badges & statuts" className="lg:col-span-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="violet">Violet</Badge>
            <Badge variant="peach">Peach</Badge>
            <Badge variant="green">Green</Badge>
            <Badge variant="gray">Gray</Badge>
            <Badge variant="red">Red</Badge>
            <Badge variant="yellow">Yellow</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status="DRAFT" />
            <StatusBadge status="COMPLETED" />
            <StatusBadge status="LINKED" />
          </div>
        </Block>

        <Block title="Champs" className="lg:col-span-6">
          <div className="space-y-3">
            <div>
              <Label htmlFor="dev-name" required>
                Nom complet
              </Label>
              <Input id="dev-name" placeholder="Ahmed Benali" />
            </div>
            <div>
              <Label htmlFor="dev-notes">Notes</Label>
              <Textarea id="dev-notes" placeholder="Notes complémentaires…" />
            </div>
          </div>
        </Block>

        <Block title="Code à 8 caractères" className="lg:col-span-6">
          <CodeInput value={code} onChange={setCode} />
          <p className="mt-4 text-[11px] text-ink-400">
            {code.length === 8 ? 'Code complet' : `${code.length} / 8`}
          </p>
        </Block>

        <Block title="Avatars & bulles" className="lg:col-span-6">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name="Ahmed Benali" size="sm" tone="violet" />
            <Avatar name="Dr. Alami" size="md" tone="peach" />
            <Avatar name="Salma Idrissi" size="lg" tone="mint" />
            <Avatar name="Dr. Benani" size="xl" tone="sky" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <IconBubble color="rose">
              <HeartPulse />
            </IconBubble>
            <IconBubble color="peach">
              <Stethoscope />
            </IconBubble>
            <IconBubble color="sky">
              <Activity />
            </IconBubble>
            <IconBubble color="violet">
              <Sparkles />
            </IconBubble>
            <IconBubble color="mint">
              <ShieldCheck />
            </IconBubble>
            <IconBubble color="yellow">
              <CalendarDays />
            </IconBubble>
          </div>
        </Block>

        <Block title="QR" className="lg:col-span-6">
          <div className="rounded-3xl bg-primary-600 p-5">
            <QRDisplay value="Sahty://claim?c=K7M29QXP" code="K7M2-9QXP" size={160} />
          </div>
        </Block>

        <Block title="Cartes de statistiques" className="lg:col-span-12">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Consultations" value={24} action={{ label: 'Voir', href: '#' }}>
              <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold text-ink-700">
                <QrCode className="h-4 w-4 text-primary-600" />
                +3 ce mois-ci
              </div>
            </StatCard>
            <HighlightCard tone="violet" title="À lier" icon={<ScanLine />}>
              <span className="text-3xl font-bold">2</span>
              <p className="mt-1 text-[11px] text-white/70">En attente du patient</p>
            </HighlightCard>
            <MiniStatCard label="Documents" value={12} hint="12 fichiers" icon={<FileText />} tone="sky" />
            <div className="rounded-3xl bg-[#E9F6F1] p-5 ring-1 ring-[#D8F0E7]">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="mt-3 text-sm font-bold">Tout est à jour</p>
              <p className="mt-1 text-[11px] text-ink-500">Aucune action en attente.</p>
            </div>
          </div>
        </Block>

        <Block title="État vide" className="lg:col-span-12">
          <EmptyState
            compact
            icon={<QrCode />}
            title="Commencez votre dossier"
            body="Présentez votre QR code au médecin pour voir apparaître la consultation."
            action={<Button variant="violet">Afficher mon QR</Button>}
          />
        </Block>
      </div>
    </main>
  );
}
