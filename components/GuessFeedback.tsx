import { twMerge } from 'tailwind-merge';

export function GuessFeedback({
  isCorrect,
  className,
}: {
  isCorrect: boolean;
  className?: string;
}) {
  return (
    <div
      className={twMerge(
        'w-4 h-4 flex items-center justify-center text-white text-xs font-bold px-1.5 rounded-full',
        isCorrect ? 'bg-green-500' : 'bg-red-500',
        className,
      )}
    >
      {isCorrect ? '✓' : '✗'}
    </div>
  );
}
