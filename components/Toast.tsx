'use client';

import { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { ErrorIcon, WarningIcon, InfoIcon, SuccessIcon } from './win98/Icons';
import { CloseGlyph, TitleBarButton } from './win98/Window';

export interface ToastProps {
  id: string;
  title?: string;
  message: string;
  variant?: 'default' | 'error' | 'warning' | 'info' | 'success';
  timeout?: number;
  onDismiss: (id: string) => void;
}

/** Not a toast so much as a message box that dismisses itself. */
export function Toast({
  id,
  title,
  message,
  variant = 'default',
  timeout = 8_000,
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    if (timeout) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [id, timeout, onDismiss]);

  const icons = {
    default: <InfoIcon size={32} />,
    error: <ErrorIcon size={32} />,
    warning: <WarningIcon size={32} />,
    info: <InfoIcon size={32} />,
    success: <SuccessIcon size={32} />,
  };

  const titles = {
    default: 'Message',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
    success: 'Success',
  };

  return (
    <div
      className={twMerge(
        'pointer-events-auto w98-window w-[300px] max-w-[calc(100vw-1rem)] animate-toast-in',
      )}
      role="status"
    >
      <div className="w98-titlebar">
        <span className="truncate grow">{title || titles[variant]}</span>
        <TitleBarButton label="Close" onClick={() => onDismiss(id)}>
          <CloseGlyph />
        </TitleBarButton>
      </div>

      <div className="flex items-start gap-3 p-3">
        <span className="flex-none pt-0.5">{icons[variant]}</span>
        <div className="grow min-w-0 text-sm break-words">
          {title && <div className="font-bold mb-0.5">{title}</div>}
          {message}
        </div>
      </div>
    </div>
  );
}
