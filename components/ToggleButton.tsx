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
        'w98-btn w98-btn-sm px-3',
        selected && 'w98-btn-checked font-bold',
      )}
    >
      {children}
    </HapticButton>
  );
}
