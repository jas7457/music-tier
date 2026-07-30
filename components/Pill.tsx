import { getStatusColor, StatusColor } from '@/lib/utils/colors';
import { twMerge } from 'tailwind-merge';

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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight whitespace-nowrap ring-1 ring-inset',
        getStatusColor(status),
        className,
      )}
    >
      {children}
    </span>
  );
}
