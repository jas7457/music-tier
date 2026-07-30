import { twMerge } from 'tailwind-merge';

import type { JSX, FC } from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outlined' | 'elevated' | 'solid' | 'plain';
  element?: 'div' | 'button' | FC<JSX.IntrinsicElements['button']>;
  onClick?: () => void;
  title?: string;
}

export default function Card({
  children,
  className = '',
  variant = 'default',
  element: Element = 'div',
  onClick,
  title,
}: CardProps) {
  const baseStyles =
    'rounded-card transition-[box-shadow,transform] duration-300 ease-out';

  // Glass by default — the aurora canvas behind supplies the colour these refract.
  const variantStyles = {
    default: 'glass',
    outlined: 'glass',
    elevated: 'glass-strong hover:shadow-glass-pop',
    solid: 'bg-surface ring-1 ring-line shadow-float',
    // No background of its own — for callers supplying their own bg utility,
    // which would otherwise race .glass in the same cascade layer.
    plain: 'ring-1 shadow-soft',
  };

  return (
    <Element
      data-component="Card"
      className={twMerge(baseStyles, variantStyles[variant], className)}
      onClick={onClick}
      title={title}
    >
      {children}
    </Element>
  );
}
