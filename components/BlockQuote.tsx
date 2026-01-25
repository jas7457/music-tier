import { MultiLine } from './MultiLine';
import { twMerge } from 'tailwind-merge';

export function BlockQuote({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <blockquote
      className={twMerge('border-l-2 border-gray-300 pl-2 italic', className)}
    >
      <MultiLine>{children}</MultiLine>
    </blockquote>
  );
}
