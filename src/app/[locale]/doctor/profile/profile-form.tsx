'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import {
  DemoRepositoryError,
  updateDoctorProfile,
  updateUserProfile,
} from '@/lib/demo/repository';
import { useDemoSessionUser } from '@/lib/demo/use-demo';

export function DoctorProfileForm({ userId, doctorId }: { userId: string; doctorId: string }) {
  const t = useTranslations('doctor.profile');
  const te = useTranslations('errors');
  const { user, doctor: sessionDoctor } = useDemoSessionUser(userId);
  const activeDoctorId = doctorId || sessionDoctor?.id || '';

  const [form, setForm] = useState(() => ({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    specialty: sessionDoctor?.specialty ?? '',
    licenseNumber: sessionDoctor?.licenseNumber ?? '',
    clinicName: sessionDoctor?.clinicName ?? '',
    city: sessionDoctor?.city ?? '',
  }));
  const [saving, setSaving] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.fullName.trim() || !form.specialty.trim()) {
      toast.error(t('required'));
      return;
    }
    setSaving(true);
    try {
      updateUserProfile(userId, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
      });
      updateDoctorProfile(activeDoctorId, {
        specialty: form.specialty.trim(),
        licenseNumber: form.licenseNumber.trim() || null,
        clinicName: form.clinicName.trim() || null,
        city: form.city.trim() || null,
      });
      toast.success(t('saved'));
    } catch (error) {
      if (error instanceof DemoRepositoryError) {
        toast.error(te(error.code));
      } else {
        toast.error(te('GENERIC'));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/70 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">{t('professionalInfo')}</h2>
          <p className="mt-0.5 text-[11px] text-ink-400">{t('subtitle')}</p>
        </div>
        <Button type="submit" variant="violet" size="md" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('save')}
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="fullName">{t('fullName')}</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <Label htmlFor="specialty">{t('specialty')}</Label>
          <Input
            id="specialty"
            value={form.specialty}
            onChange={(event) => update('specialty', event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="licenseNumber">{t('licenseNumber')}</Label>
          <Input
            id="licenseNumber"
            value={form.licenseNumber}
            onChange={(event) => update('licenseNumber', event.target.value)}
            className="ltr-code"
          />
        </div>
        <div>
          <Label htmlFor="clinicName">{t('clinicName')}</Label>
          <Input
            id="clinicName"
            value={form.clinicName}
            onChange={(event) => update('clinicName', event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="city">{t('city')}</Label>
          <Input
            id="city"
            value={form.city}
            onChange={(event) => update('city', event.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="phone">{t('phone')}</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
            placeholder="+212 6 00 00 00 00"
            dir="ltr"
            className="ltr-code"
            autoComplete="tel"
          />
        </div>
      </div>
    </form>
  );
}
