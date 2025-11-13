"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { Toast } from "@/components/Toast";

type ToastVariant = "default" | "error" | "warning" | "info";

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  dismissible?: boolean;
  timeout?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  variant: ToastVariant;
  dismissible: boolean;
}

interface ToastContextValue {
  show: (options: ToastOptions) => string;
  hide: (id: string) => void;
  hideAll: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => "",
  hide: () => {},
  hideAll: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((options: ToastOptions): string => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastItem = {
      id,
      message: options.message,
      variant: options.variant || "default",
      dismissible: options.dismissible ?? true,
      timeout: options.timeout || 5000,
    };

    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const hide = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const hideAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo(() => ({ show, hide, hideAll }), [show, hide, hideAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            variant={toast.variant}
            dismissible={toast.dismissible}
            timeout={toast.timeout}
            onDismiss={hide}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
