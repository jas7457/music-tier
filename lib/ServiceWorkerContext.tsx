"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { JASON_ID } from "./utils/constants";
import { useAuth } from "./AuthContext";

type ServiceWorkerContextType = {
  registration: ServiceWorkerRegistration | null;
  isSupported: boolean;
  isEnabled: boolean;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  unregisterServiceWorker: () => Promise<boolean>;
  sendMessageToSW: (message: any) => void;
};

const ServiceWorkerContext = createContext<ServiceWorkerContextType | null>(
  null
);

export function ServiceWorkerProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string;
}) {
  const { user } = useAuth();
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  const hasInitializedServiceWorkerRef = useRef(false);
  const isEnabled = user?._id === JASON_ID;

  useLayoutEffect(() => {
    setIsSupported(
      typeof window !== "undefined" && "serviceWorker" in navigator
    );

    // Check initial notification permission
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useLayoutEffect(() => {
    if (!isSupported || !isEnabled || hasInitializedServiceWorkerRef.current) {
      return;
    }

    hasInitializedServiceWorkerRef.current = true;

    // Register the service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[App] Service Worker registered:", reg);
        setRegistration(reg);

        // Check for updates periodically
        setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000); // Check every hour

        // Listen for controller change (new service worker activated)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[App] New service worker activated, reloading...");
          window.location.reload();
        });
      })
      .catch((error) => {
        console.error("[App] Service Worker registration failed:", error);
      });
  }, [isEnabled, isSupported, userId]);

  const contextValue = useMemo(() => {
    return {
      registration,
      isSupported,
      isEnabled,
      notificationPermission,
      requestNotificationPermission:
        async (): Promise<NotificationPermission> => {
          if (!("Notification" in window)) {
            console.warn("[App] Notifications not supported");
            return "denied";
          }

          try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            console.log("[App] Notification permission:", permission);
            return permission;
          } catch (error) {
            console.error(
              "[App] Error requesting notification permission:",
              error
            );
            return "denied";
          }
        },
      unregisterServiceWorker: async (): Promise<boolean> => {
        if (!registration) {
          return false;
        }

        try {
          // Clear all caches
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));

          // Unregister the service worker
          const success = await registration.unregister();
          console.log("[App] Service Worker unregistered:", success);

          if (success) {
            setRegistration(null);
            // Reload the page to ensure clean state
            window.location.reload();
          }

          return success;
        } catch (error) {
          console.error("[App] Error unregistering service worker:", error);
          return false;
        }
      },
      sendMessageToSW: (message: any) => {
        if (registration && registration.active) {
          registration.active.postMessage(message);
        }
      },
    };
  }, [registration, isSupported, isEnabled, notificationPermission]);

  return (
    <ServiceWorkerContext.Provider value={contextValue}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}

export function useServiceWorker() {
  const context = useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error(
      "useServiceWorker must be used within a ServiceWorkerProvider"
    );
  }
  return context;
}
