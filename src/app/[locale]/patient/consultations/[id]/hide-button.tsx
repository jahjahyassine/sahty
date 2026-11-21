'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DemoRepositoryError, hideConsultation } from '@/lib/demo/repository';

export function HideConsultationButton({
  patientId,
  consultationId,
  hidden,
}: {
  patientId: string;
  consultationId: string;
  hidden: boolean;
}) {
  const t = useTranslations('patient.detail');
  const tq = useTranslations('patient.consultations');
  const tc = useTranslations('common');
  const [pending, setPending] = useState(false);

  function toggle() {
    setPending(true);
    try {
      hideConsultation(patientId, consultationId, !hidden);
      toast.success(hidden ? t('unhideSuccess') : t('hideSuccess'));
    } catch (error) {
      const message =
        error instanceof DemoRepositoryError ? error.message : tc('error');
      toast.error(message || tc('error'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="md" onClick={toggle} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : hidden ? (
        <Eye className="h-4 w-4" />
      ) : (
        <EyeOff className="h-4 w-4" />
      )}
      {hidden ? tq('unhide') : tq('hide')}
    </Button>
  );
}
