'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { useDemoSnapshot } from '@/lib/demo/use-demo';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/demo/repository';
import type { DemoNotification } from '@/lib/demo/types';

export function NotificationsMenu({
  userId,
  initialUnread,
}: {
  userId: string;
  initialUnread?: number;
}) {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const router = useRouter();
  const db = useDemoSnapshot();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () =>
      db.notifications
        .filter((notification) => notification.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [db, userId],
  );
  const unread = useMemo(
    () => db.notifications.filter((item) => item.userId === userId && !item.readAt).length,
    [db, userId],
  );

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function handleItem(item: DemoNotification) {
    markNotificationRead(userId, item.id);
    setOpen(false);
    if (item.href) {
      router.push(item.href.startsWith('/') ? `/${locale}${item.href}` : item.href);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t('title')}
        aria-expanded={open}
        className={cn(
          'relative grid h-10 w-10 place-items-center rounded-full bg-white text-ink-500 ring-1 ring-line/80 transition-all hover:bg-primary-50 hover:text-primary-700',
          open && 'bg-primary-50 text-primary-700',
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 || (initialUnread ?? 0) > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread || initialUnread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute end-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-[370px] overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-line animate-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <div>
              <p className="text-sm font-bold text-ink-900">{t('title')}</p>
              {unread > 0 ? (
                <p className="text-[10px] font-medium text-accent-500">
                  {unread} {t('new')}
                </p>
              ) : null}
            </div>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markAllNotificationsRead(userId)}
                className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1.5 text-[10px] font-semibold text-primary-700 transition-colors hover:bg-primary-100"
              >
                <CheckCheck className="h-3 w-3" />
                {t('markAll')}
              </button>
            ) : null}
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-50 text-primary-400">
                  <Inbox className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold text-ink-900">{t('empty')}</p>
                <p className="text-xs text-ink-400">{t('emptyBody')}</p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItem(item)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-2xl p-3 text-start transition-colors',
                    item.readAt ? 'hover:bg-primary-50/60' : 'bg-primary-50/70 hover:bg-primary-100/60',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl',
                      item.readAt ? 'bg-primary-50 text-primary-400' : 'bg-primary-600 text-white',
                    )}
                  >
                    <Bell className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-ink-900">{item.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-ink-500">
                      {item.body}
                    </span>
                    <span className="mt-1 block text-[10px] text-ink-300">
                      {formatDate(item.createdAt, locale, {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                  {!item.readAt ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-400" /> : null}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-line px-4 py-2.5">
            <Link
              href={`/${locale}/notifications`}
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-primary-600 hover:text-primary-800"
            >
              {t('viewAll')}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
