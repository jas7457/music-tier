'use client';

import { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { CloseGlyph, TitleBarButton } from './Window';
import { W98Button } from './Controls';
import { ErrorIcon, InfoIcon, WarningIcon, HelpIcon } from './Icons';

export type DialogKind = 'info' | 'warning' | 'error' | 'question' | 'none';

const kindIcon: Record<DialogKind, React.ReactNode> = {
  info: <InfoIcon size={32} />,
  warning: <WarningIcon size={32} />,
  error: <ErrorIcon size={32} />,
  question: <HelpIcon size={32} />,
  none: null,
};

/**
 * A modal message box. Sits on a transparent overlay — 98 never dimmed what
 * was behind a dialog, it just took focus.
 */
export function Dialog({
  title,
  kind = 'none',
  message,
  children,
  buttons,
  onClose,
  className,
}: {
  title: string;
  kind?: DialogKind;
  message?: React.ReactNode;
  children?: React.ReactNode;
  buttons?: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-200 flex items-start justify-center p-4 pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={twMerge('w98-window w-full max-w-sm', className)}>
        <div className="w98-titlebar">
          <span className="truncate grow">{title}</span>
          <TitleBarButton label="Close" onClick={onClose}>
            <CloseGlyph />
          </TitleBarButton>
        </div>

        <div className="p-4 flex gap-4 items-start">
          {kindIcon[kind] && (
            <div className="flex-none pt-0.5">{kindIcon[kind]}</div>
          )}
          <div className="grow min-w-0 text-sm">
            {message}
            {children}
          </div>
        </div>

        <div className="flex justify-center gap-2 pb-3 px-3">
          {buttons ?? (
            <W98Button variant="default" onClick={onClose}>
              OK
            </W98Button>
          )}
        </div>
      </div>
    </div>
  );
}
