"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import PusherClient from "pusher-js";
import type { Channel } from "pusher-js";
import {
  PUSHER_REAL_TIME_UPDATES,
  PUSHER_CLUSTER,
  PUSHER_PUBLIC_KEY,
  PUSHER_NOTIFICATIONS,
  logo,
} from "./utils/constants";
import { useData } from "./DataContext";
import { useToast } from "./ToastContext";
import { useAuth } from "./AuthContext";
import type { Notification } from "./notifications";

type PusherContextType = {
  pusher: PusherClient | null;
  subscribe: (channelName: string) => Channel | null;
  unsubscribe: (channelName: string) => void;
};

const PusherContext = createContext<PusherContextType | null>(null);

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const [pusher, setPusher] = useState<PusherClient | null>(null);

  const contextValue = useMemo(() => {
    const subscribe = (channelName: string): Channel | null => {
      if (!pusher) return null;
      return pusher.subscribe(channelName);
    };

    const unsubscribe = (channelName: string) => {
      if (!pusher) return;
      pusher.unsubscribe(channelName);
    };

    return { pusher, subscribe, unsubscribe };
  }, [pusher]);

  useEffect(() => {
    const pusherClient = new PusherClient(PUSHER_PUBLIC_KEY, {
      cluster: PUSHER_CLUSTER,
    });

    setPusher(pusherClient);

    return () => {
      pusherClient.disconnect();
    };
  }, []);

  return (
    <PusherContext.Provider value={contextValue}>
      {children}
    </PusherContext.Provider>
  );
}

export function usePusher() {
  const pusherContext = useContext(PusherContext);
  if (!pusherContext) {
    throw new Error("usePusher must be used within a PusherProvider");
  }
  return pusherContext;
}

// Hook for subscribing to updates
export function useRealTimeUpdates() {
  const { refreshData } = useData();
  const { subscribe, unsubscribe } = usePusher();

  useNotifications();

  useEffect(() => {
    const channel = subscribe(PUSHER_REAL_TIME_UPDATES);
    if (!channel) {
      return;
    }
    const updateHandler = () => {
      refreshData("pusherUpdate");
    };
    channel.bind("update", updateHandler);

    return () => {
      channel.unbind("update", updateHandler);
      unsubscribe(PUSHER_REAL_TIME_UPDATES);
    };
  }, [refreshData, subscribe, unsubscribe]);
}

function useNotifications() {
  const toast = useToast();
  const { user } = useAuth();
  const { subscribe, unsubscribe } = usePusher();

  useEffect(() => {
    const channel = subscribe(PUSHER_NOTIFICATIONS);
    if (!channel) {
      return;
    }
    const notificationHandler = ({
      notifications,
    }: {
      notifications: Notification[];
    }) => {
      notifications.forEach((notification) => {
        if (notification.userIds.includes(user?._id || "")) {
          toast.show({
            title: notification.title,
            message: notification.message,
            variant: "info",
            timeout: 10_000,
          });

          if (
            !("Notification" in window) ||
            Notification.permission !== "granted"
          ) {
            return;
          }
          new Notification(notification.title, {
            body: notification.message,
            icon: logo.src,
          });
        }
      });
    };
    channel.bind("notification", notificationHandler);

    return () => {
      channel.unbind("notification", notificationHandler);
      unsubscribe(PUSHER_NOTIFICATIONS);
    };
  }, [subscribe, toast, unsubscribe, user?._id]);
}
