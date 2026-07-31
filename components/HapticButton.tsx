'use client';

import { useState, type JSX } from 'react';
import { twMerge } from 'tailwind-merge';

interface HapticButtonProps extends Pick<
  JSX.IntrinsicElements['button'],
  'className' | 'children' | 'onClick' | 'disabled' | 'title' | 'type' | 'style'
> {}

/**
 * The feedback is the bevel flip, not a scale — 98 controls never moved, they
 * inverted. `data-pressed` lets CSS drive the pressed look for anything
 * wearing `.w98-btn`.
 */
export function HapticButton({
  children,
  className,
  ...rest
}: HapticButtonProps &
  Pick<JSX.IntrinsicElements['button'], 'className' | 'children' | 'onClick'>) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      {...rest}
      data-pressed={isPressed ? 'true' : undefined}
      className={twMerge('disabled:cursor-default', className)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      {children}
    </button>
  );
}
