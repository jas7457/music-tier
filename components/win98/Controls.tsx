'use client';

import { twMerge } from 'tailwind-merge';
import Link from 'next/link';
import type { JSX, ReactNode } from 'react';

/* ---------------------------------------------------------------- Button */

type NativeButtonProps = Pick<
  JSX.IntrinsicElements['button'],
  | 'className'
  | 'children'
  | 'onClick'
  | 'disabled'
  | 'title'
  | 'type'
  | 'style'
  | 'id'
>;

export interface W98ButtonProps extends NativeButtonProps {
  /** `default` carries the extra black ring a dialog's default action had. */
  variant?: 'normal' | 'default' | 'flat';
  size?: 'md' | 'sm';
  /** Sticky toolbar state — drawn pressed-in with the 50% dither. */
  checked?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function W98Button({
  variant = 'normal',
  size = 'md',
  checked,
  icon,
  fullWidth,
  className,
  children,
  type = 'button',
  ...rest
}: W98ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={twMerge(
        'w98-btn',
        size === 'sm' && 'w98-btn-sm',
        variant === 'default' && 'w98-btn-default',
        variant === 'flat' && 'w98-btn-flat',
        checked && 'w98-btn-checked',
        fullWidth && 'w-full',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** A button that navigates. Same chrome, anchor semantics. */
export function W98LinkButton({
  href,
  className,
  children,
  icon,
  size = 'md',
  variant = 'normal',
  onClick,
  title,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
  size?: 'md' | 'sm';
  variant?: 'normal' | 'default' | 'flat';
  onClick?: () => void;
  title?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={title}
      className={twMerge(
        'w98-btn no-underline text-black',
        size === 'sm' && 'w98-btn-sm',
        variant === 'default' && 'w98-btn-default',
        variant === 'flat' && 'w98-btn-flat',
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------- GroupBox */

export function GroupBox({
  label,
  children,
  className,
  labelClassName,
}: {
  label?: ReactNode;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <fieldset className={twMerge('w98-group', className)}>
      {label && (
        <legend className={twMerge('w98-group-label', labelClassName)}>
          {label}
        </legend>
      )}
      {children}
    </fieldset>
  );
}

/* ------------------------------------------------------------- StatusBar */

export function StatusBar({
  cells,
  className,
}: {
  cells: (ReactNode | { content: ReactNode; grow?: boolean })[];
  className?: string;
}) {
  return (
    <div className={twMerge('w98-statusbar', className)}>
      {cells.map((cell, i) => {
        const isObject =
          cell !== null &&
          typeof cell === 'object' &&
          'content' in (cell as any);
        const content = isObject ? (cell as any).content : cell;
        const grow = isObject ? (cell as any).grow : i === 0;
        return (
          <div
            key={i}
            className={twMerge(
              'w98-statusbar-cell truncate',
              grow ? 'grow' : 'flex-none',
            )}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Tabs */

export interface TabItem {
  id: string;
  label: ReactNode;
}

export function Tabs({
  tabs,
  activeId,
  onChange,
  className,
}: {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={twMerge('w98-tabs', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeId}
          onClick={() => onChange(tab.id)}
          className="w98-tab"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** The panel a tab strip sits on. Raised, and it swallows the tab's bottom edge. */
export function TabPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={twMerge('w98-raised p-3', className)} role="tabpanel">
      {children}
    </div>
  );
}

/* -------------------------------------------------------------- Progress */

export function ProgressBar({
  value,
  max = 100,
  className,
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={twMerge('w98-progress', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-label={label}
    >
      <div className="w98-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ----------------------------------------------------------------- Field */

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
  required,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={twMerge('grid gap-1', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm">
          {label}
          {required && ' *'}
        </label>
      )}
      {children}
      {hint && <div className="text-xs text-w98-shadow">{hint}</div>}
    </div>
  );
}

export function Separator({ vertical }: { vertical?: boolean }) {
  return <div className={vertical ? 'w98-separator-v' : 'w98-separator'} />;
}
