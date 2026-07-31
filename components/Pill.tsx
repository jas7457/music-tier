import { getStatusColor, StatusColor } from '@/lib/utils/colors';
import { twMerge } from 'tailwind-merge';

/** A status chip drawn as a tiny bevelled badge rather than a rounded tag. */
export function Pill({
  children,
  status,
  className,
}: {
  children: React.ReactNode;
  status: StatusColor;
  className?: string;
}) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center px-1.5 py-px text-xs font-bold uppercase tracking-wide whitespace-nowrap w98-raised-thin',
        getStatusColor(status),
        className,
      )}
    >
      {children}
    </span>
  );
}
