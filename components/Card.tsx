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

/**
 * A panel. In 98 terms every card is either a raised control surface or a
 * recessed well — `outlined` gets the well, everything else gets the bevel.
 */
export default function Card({
  children,
  className = '',
  variant = 'default',
  element: Element = 'div',
  onClick,
  title,
}: CardProps) {
  const baseStyles = 'text-black';

  const variantStyles = {
    default: 'w98-raised',
    outlined: 'w98-sunken',
    elevated: 'w98-raised',
    solid: 'w98-raised',
    // Caller supplies its own background; it still gets the chiselled edge.
    plain: 'w98-raised-thin',
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
