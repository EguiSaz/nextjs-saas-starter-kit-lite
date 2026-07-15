import Link from 'next/link';

import { cn } from '@kit/ui/utils';

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden={true}
    >
      <rect width={28} height={28} rx={7} className={'fill-primary'} />
      {/* Edificio */}
      <path
        d="M8 21V9.5L14 6.5L20 9.5V21H8Z"
        className={'fill-white dark:fill-white'}
        opacity={0.95}
      />
      <rect x={10.5} y={11} width={2} height={2} rx={0.5} className={'fill-primary'} />
      <rect x={15.5} y={11} width={2} height={2} rx={0.5} className={'fill-primary'} />
      <rect x={10.5} y={14.5} width={2} height={2} rx={0.5} className={'fill-primary'} />
      <rect x={15.5} y={14.5} width={2} height={2} rx={0.5} className={'fill-primary'} />
      <rect x={12.75} y={17.5} width={2.5} height={3.5} rx={0.5} className={'fill-primary'} />
    </svg>
  );
}

function LogoImage({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoMark />
      <span
        className={
          'text-primary text-lg font-bold tracking-tight dark:text-white'
        }
      >
        Gestor<span className={'text-primary/70 dark:text-white/70'}>Pro</span>
      </span>
    </div>
  );
}

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string | null;
  className?: string;
  label?: string;
}) {
  if (href === null) {
    return <LogoImage className={className} />;
  }

  return (
    <Link aria-label={label ?? 'GestorPro'} href={href ?? '/'}>
      <LogoImage className={className} />
    </Link>
  );
}
