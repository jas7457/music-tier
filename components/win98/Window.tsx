'use client';

import { twMerge } from 'tailwind-merge';
import type { ReactNode } from 'react';

/* Title-bar glyphs. Drawn at 1:1 pixel scale — these were bitmaps, not fonts. */

export function MinimizeGlyph() {
  return (
    <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true">
      <rect x="0" y="4" width="6" height="2" fill="currentColor" />
    </svg>
  );
}

export function MaximizeGlyph() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="8"
        height="8"
        fill="none"
        stroke="currentColor"
      />
      <rect x="0" y="0" width="9" height="2" fill="currentColor" />
    </svg>
  );
}

export function RestoreGlyph() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
      <rect
        x="2.5"
        y="0.5"
        width="6"
        height="5"
        fill="none"
        stroke="currentColor"
      />
      <rect x="2" y="0" width="7" height="2" fill="currentColor" />
      <rect
        x="0.5"
        y="3.5"
        width="6"
        height="5"
        fill="var(--color-w98-face)"
        stroke="currentColor"
      />
      <rect x="0" y="3" width="7" height="2" fill="currentColor" />
    </svg>
  );
}

export function CloseGlyph() {
  return (
    <svg width="8" height="7" viewBox="0 0 8 7" aria-hidden="true">
      <path
        d="M0 0h2l2 2 2-2h2L5 3.5 8 7H6L4 5 2 7H0l3-3.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function TitleBarButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={twMerge('w98-titlebar-btn', className)}
    >
      {children}
    </button>
  );
}

export interface WindowProps {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  inactive?: boolean;
  /* Chrome buttons. Omitted handlers render the button greyed, as 98 did for
     unavailable window commands. */
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  isMaximized?: boolean;
  menuBar?: ReactNode;
  statusBar?: ReactNode;
  /* Renders the body as a white document well rather than a grey dialog. */
  paper?: boolean;
}

export function Window({
  title,
  icon,
  children,
  className,
  bodyClassName,
  inactive,
  onMinimize,
  onMaximize,
  onClose,
  isMaximized,
  menuBar,
  statusBar,
  paper,
}: WindowProps) {
  return (
    <div className={twMerge('w98-window flex flex-col', className)}>
      <div
        className={twMerge(
          'w98-titlebar flex-none',
          inactive && 'w98-titlebar-inactive',
        )}
      >
        {icon && <span className="flex-none">{icon}</span>}
        <span className="truncate grow">{title}</span>

        <span className="flex items-center gap-px flex-none">
          <TitleBarButton
            label="Minimize"
            onClick={onMinimize}
            disabled={!onMinimize}
          >
            <MinimizeGlyph />
          </TitleBarButton>
          <TitleBarButton
            label={isMaximized ? 'Restore' : 'Maximize'}
            onClick={onMaximize}
            disabled={!onMaximize}
          >
            {isMaximized ? <RestoreGlyph /> : <MaximizeGlyph />}
          </TitleBarButton>
          <TitleBarButton
            label="Close"
            onClick={onClose}
            disabled={!onClose}
            className="ml-0.5"
          >
            <CloseGlyph />
          </TitleBarButton>
        </span>
      </div>

      {menuBar && <div className="w98-menubar flex-none">{menuBar}</div>}

      <div
        className={twMerge(
          'mt-0.5 grow min-h-0',
          paper && 'w98-paper',
          paper ? 'p-2' : 'p-1.5',
          bodyClassName,
        )}
      >
        {children}
      </div>

      {statusBar && <div className="flex-none mt-0.5">{statusBar}</div>}
    </div>
  );
}
