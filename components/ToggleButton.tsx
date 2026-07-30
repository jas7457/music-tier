import { twMerge } from 'tailwind-merge';
import { HapticButton } from './HapticButton';

export function ToggleButton({
  children,
  onClick,
  selected,
}: {
  onClick: () => void;
  children: React.ReactNode;
  selected: boolean;
}) {
  return (
    <HapticButton
      type="button"
      onClick={onClick}
      className={twMerge(
        'px-4 py-1.5 rounded-[0.5rem] text-sm font-semibold tracking-tight',
        selected
          ? 'bg-white/90 text-ink shadow-soft'
          : 'bg-transparent text-ink-muted hover:bg-white/40 hover:text-ink',
      )}
    >
      {children}
    </HapticButton>
  );
}
