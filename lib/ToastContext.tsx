'use client';

import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { Toast, ToastProps } from '@/components/Toast';

export type ToastOptions = Omit<ToastProps, 'id' | 'onDismiss'>;
type ToastItem = Omit<ToastProps, 'onDismiss'>;

interface ToastContextValue {
  show: (options: ToastOptions) => string;
  hide: (id: string) => void;
  hideAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const ToastListContext = createContext<ToastItem[]>([]);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const value = useMemo(() => {
    return {
      show: (options: ToastOptions): string => {
        const id = Math.random().toString(36).substring(2, 9);
        const toast: ToastItem = {
          id,
          ...options,
        };
        if (toast.title && toast.title === toast.message) {
          delete toast.title;
        }

        setToasts((prev) => [...prev, toast]);
        return id;
      },
      hide: (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      },
      hideAll: () => {
        setToasts([]);
      },
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      <ToastListContext.Provider value={toasts}>
        {children}
      </ToastListContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contextValue = useContext(ToastContext);

  if (!contextValue) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return contextValue;
}

/** Renders the toasts. Lives inside the Game Boy screen (see Layout). */
export function ToastViewport() {
  const toasts = useContext(ToastListContext);
  const { hide } = useToast();
  if (toasts.length === 0) {
    return null;
  }
  return (
    <div className="absolute top-2 left-2 right-2 z-8000 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={hide} />
      ))}
    </div>
  );
}
