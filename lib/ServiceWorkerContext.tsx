"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ServiceWorkerContextType = {
  registration: ServiceWorkerRegistration | null;
  isSupported: boolean;
  isEnabled: boolean;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  unregisterServiceWorker: () => Promise<boolean>;
  sendMessageToSW: (message: any) => void;
  subscribeToPush: () => Promise<boolean>;
};

const ServiceWorkerContext = createContext<ServiceWorkerContextType | null>(
  null
);

// Helper function to convert VAPID public key
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function ServiceWorkerProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string;
}) {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  const hasInitializedServiceWorkerRef = useRef(false);
  const isEnabled = true;

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
      .then(async (reg) => {
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

        // If notification permission is granted, subscribe to push
        if (Notification.permission === "granted") {
          try {
            await subscribeToPushNotifications(reg);
          } catch (error) {
            console.error("[App] Failed to subscribe to push:", error);
          }
        }
      })
      .catch((error) => {
        console.error("[App] Service Worker registration failed:", error);
      });
  }, [isEnabled, isSupported, userId]);

  async function subscribeToPushNotifications(
    reg: ServiceWorkerRegistration
  ): Promise<boolean> {
    try {
      // Get the VAPID public key from the server
      const response = await fetch("/api/push/subscribe");
      if (!response.ok) {
        throw new Error("Failed to get VAPID public key");
      }

      const { publicKey } = await response.json();

      // Subscribe to push notifications
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const subscribeResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!subscribeResponse.ok) {
        throw new Error("Failed to save subscription");
      }

      console.log("[App] Push subscription successful");
      return true;
    } catch (error) {
      console.error("[App] Error subscribing to push:", error);
      return false;
    }
  }

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

            // If permission granted and we have a registration, subscribe to push
            if (permission === "granted" && registration) {
              await subscribeToPushNotifications(registration);
            }

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
      subscribeToPush: async (): Promise<boolean> => {
        if (!registration) {
          console.error("[App] No service worker registration");
          return false;
        }
        return subscribeToPushNotifications(registration);
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
