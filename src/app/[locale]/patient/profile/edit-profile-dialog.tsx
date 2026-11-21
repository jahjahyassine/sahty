'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { DemoRepositoryError, updateUserProfile } from '@/lib/demo/repository';
import { useDemoSessionUser } from '@/lib/demo/use-demo';

export function EditProfileDialog({ userId }: { userId: string }) {
  const t = useTranslations('patient.profile');
  const tc = useTranslations('common');
  const { user } = useDemoSessionUser(userId);
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [pending, setPending] = useState(false);

  // Synchronise le formulaire quand le dépôt.navigateur change (après sauvegarde).
  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setPhone(user.phone ?? '');
  }, [user?.fullName, user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    if (fullName.trim().length < 3) {
      toast.error(tc('required'));
      return;
    }
    setPending(true);
    try {
      updateUserProfile(userId, {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
      });
      toast.success(tc('saved'));
      setOpen(false);
    } catch (error) {
      const message = error instanceof DemoRepositoryError ? error.message : tc('error');
      toast.error(message || tc('error'));
    } finally {
      setPending(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/25"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t('editProfile')}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editProfile')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">{t('fullName')}</Label>
            <Input id="edit-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-phone">{t('phone')}</Label>
            <Input id="edit-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-email">{t('email')}</Label>
            <Input id="edit-email" value={user.email} disabled />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            {tc('cancel')}
          </Button>
          <Button variant="primary" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tc('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
