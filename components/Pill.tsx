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
        'inline-flex items-center px-1.5 py-0.5 text-xs font-bold uppercase leading-none whitespace-nowrap ring-2 ring-inset',
        getStatusColor(status),
        className,
      )}
    >
      {children}
    </span>
  );
}
