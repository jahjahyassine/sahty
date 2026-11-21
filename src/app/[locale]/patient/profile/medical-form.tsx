'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { HeartPulse, Loader2, Plus, Save, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { DemoRepositoryError, updatePatientMedicalInfo } from '@/lib/demo/repository';
import { useDemoSnapshot } from '@/lib/demo/use-demo';
import { BLOOD_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';

function ChipInput({
  items,
  onChange,
  placeholder,
  tone,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  tone: 'danger' | 'warning';
}) {
  const [value, setValue] = useState('');

  function add() {
    const clean = value.trim();
    if (!clean) return;
    if (items.some((item) => item.toLowerCase() === clean.toLowerCase())) {
      setValue('');
      return;
    }
    onChange([...items, clean]);
    setValue('');
  }

  return (
    <div
      className={cn(
        'flex min-h-[52px] flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-white px-3 py-2.5 shadow-sm focus-within:border-primary-300 focus-within:ring-4 focus-within:ring-primary-100/70',
      )}
    >
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            tone === 'danger' ? 'bg-[#FDECE9] text-[#B56254]' : 'bg-[#FDF4DE] text-[#8A6A18]',
          )}
        >
          {item}
          <button
            type="button"
            onClick={() => onChange(items.filter((entry) => entry !== item))}
            className="grid h-4 w-4 place-items-center rounded-full bg-white/70 hover:bg-white"
            aria-label={`Remove ${item}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add();
          }
          if (event.key === 'Backspace' && !value && items.length > 0) {
            onChange(items.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={placeholder}
        className="h-7 min-w-[140px] flex-1 bg-transparent text-xs outline-none placeholder:text-ink-300"
      />
      <button
        type="button"
        onClick={add}
        className="grid h-6 w-6 place-items-center rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100"
        aria-label="Add"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function MedicalInfoForm({ patientId }: { patientId: string }) {
  const t = useTranslations('patient.profile');
  const tc = useTranslations('common');
  const db = useDemoSnapshot();
  const patient = db.patients.find((item) => item.id === patientId) ?? null;

  const [bloodType, setBloodType] = useState(patient?.bloodType ?? '');
  const [allergies, setAllergies] = useState<string[]>(patient?.allergies ?? []);
  const [diseases, setDiseases] = useState<string[]>(patient?.chronicDiseases ?? []);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!patient) return;
    setBloodType(patient.bloodType ?? '');
    setAllergies(patient.allergies);
    setDiseases(patient.chronicDiseases);
  }, [patient]);

  function save() {
    setPending(true);
    try {
      updatePatientMedicalInfo(patientId, {
        bloodType: bloodType || null,
        allergies,
        chronicDiseases: diseases,
      });
      toast.success(t('saved'));
    } catch (error) {
      const message = error instanceof DemoRepositoryError ? error.message : tc('error');
      toast.error(message || tc('error'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[30px] bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E9F6F1] text-success">
            <HeartPulse className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold">{t('medicalInfo')}</h2>
            <p className="mt-0.5 text-[11px] text-ink-400">
              {tc('optional')} · {tc('privacy')}
            </p>
          </div>
        </div>
        <Button variant="primary" size="md" onClick={save} disabled={pending || !patient}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('saveMedical')}
        </Button>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <Label>{t('bloodType')}</Label>
          <div className="grid grid-cols-4 gap-2 sm:max-w-md">
            {BLOOD_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBloodType(bloodType === type ? '' : type)}
                className={cn(
                  'h-11 rounded-2xl text-sm font-bold transition-all',
                  bloodType === type
                    ? 'bg-primary-600 text-white shadow-soft'
                    : 'bg-primary-50 text-ink-500 hover:bg-primary-100 hover:text-primary-700',
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>{t('allergies')}</Label>
          <ChipInput items={allergies} onChange={setAllergies} placeholder={t('addAllergy')} tone="danger" />
          {allergies.length === 0 ? (
            <p className="mt-1.5 text-[10px] text-ink-400">{t('noAllergies')}</p>
          ) : null}
        </div>

        <div>
          <Label>{t('chronicDiseases')}</Label>
          <ChipInput items={diseases} onChange={setDiseases} placeholder={t('addDisease')} tone="warning" />
          {diseases.length === 0 ? (
            <p className="mt-1.5 text-[10px] text-ink-400">{t('noDiseases')}</p>
          ) : null}
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-primary-50/70 p-3.5 ring-1 ring-primary-100/60">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
          <div>
            <p className="text-[11px] font-semibold text-ink-700">{t('security')}</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-ink-500">{t('privacyNote')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
