import Link from 'next/link';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 shadow-soft',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="h-[30px] w-[30px]" fill="none">
        <path
          d="M20 33.2c-.6 0-1.2-.2-1.7-.6C14 28.9 7 23 7 15.9 7 11.5 10.4 8 14.7 8c2.2 0 4.1.9 5.3 2.6C21.2 8.9 23.1 8 25.3 8 29.6 8 33 11.5 33 15.9c0 7.1-7 13-11.3 16.7-.5.4-1.1.6-1.7.6Z"
          fill="white"
        />
        <path
          d="M10.2 21h5.1l2.1-4.4 3.5 9.6 2.8-6.4h5.9"
          stroke="#6F63B5"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M26.8 12.4c3.1-3.4 6.6-4.1 7.4-2.7.8 1.4-.8 4.7-4.4 6.1-2.2.9-3.9.4-3.9.4s-.1-1.9.9-3.8Z"
          fill="#F7926B"
        />
        <path d="M28.6 15.8c1.1-2.1 3.1-3.6 4.7-4.3" stroke="#FFF" strokeOpacity=".55" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({
  variant = 'default',
  compact = false,
  href,
  className,
}: {
  variant?: 'default' | 'light';
  compact?: boolean;
  href?: string;
  className?: string;
}) {
  const light = variant === 'light';
  const content = (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={cn('font-arabic text-[23px] font-bold leading-none tracking-tight', light ? 'text-white' : 'text-ink-900')}>
            صحتي
          </span>
          <span
            className={cn(
              'mt-1.5 text-[9px] font-semibold uppercase tracking-[0.3em]',
              light ? 'text-white/70' : 'text-ink-400',
            )}
          >
            Sahty
          </span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center rounded-2xl focus-ring">
        {content}
      </Link>
    );
  }
  return content;
}
