"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { Toast, ToastProps } from "@/components/Toast";

export type ToastOptions = Omit<ToastProps, "id" | "onDismiss">;
type ToastItem = Omit<ToastProps, "onDismiss">;

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
      ...options,
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
          <Toast key={toast.id} {...toast} onDismiss={hide} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
