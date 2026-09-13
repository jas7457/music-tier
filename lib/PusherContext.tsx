'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PusherClient from 'pusher-js';
import type { Channel } from 'pusher-js';
import {
  PUSHER_REAL_TIME_UPDATES,
  PUSHER_CLUSTER,
  PUSHER_PUBLIC_KEY,
  PUSHER_NOTIFICATIONS,
} from './utils/constants';
import { useData } from './DataContext';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import type { Notification } from './notifications';

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

    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    throw new Error('usePusher must be used within a PusherProvider');
  }
  return pusherContext;
}

// The largest delay setTimeout can hold without overflowing its 32-bit signed
// timer (~24.8 days). Boundaries further out than this are left to the
// refresh-on-focus path instead of a single long timer.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Hook for subscribing to real-time updates.
 *
 * Phase transitions are derived from dates, so when a round advances purely on
 * the clock (no submit/vote to broadcast) nothing tells an open page to move on.
 * `refreshAt` is a list of upcoming boundary timestamps (submission/voting
 * open/close). We refetch at the soonest future one — a single precise timer,
 * not a poll — and also refetch whenever the tab regains focus, so a page left
 * open advances on its own.
 */
export function useRealTimeUpdates(refreshAt: number[] = []) {
  const { refreshData } = useData();
  const { subscribe, unsubscribe } = usePusher();
  const { user } = useAuth();

  useNotifications();

  useEffect(() => {
    const channel = subscribe(PUSHER_REAL_TIME_UPDATES);
    if (!channel) {
      return;
    }
    const updateHandler = ({ userIds }: { userIds?: string[] }) => {
      if (
        !userIds ||
        userIds.length === 0 ||
        userIds.includes(user?._id || '')
      ) {
        refreshData('pusherUpdate');
      }
    };
    channel.bind('update', updateHandler);

    return () => {
      channel.unbind('update', updateHandler);
      unsubscribe(PUSHER_REAL_TIME_UPDATES);
    };
  }, [refreshData, subscribe, unsubscribe, user?._id]);

  // Refetch when the tab is shown again or regains focus.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshData('scheduled');
      }
    };
    const onFocus = () => refreshData('scheduled');
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshData]);

  // Refetch exactly when the next phase boundary passes.
  const nextBoundary = useMemo(() => {
    const now = Date.now();
    const future = refreshAt.filter((ts) => ts > now);
    return future.length > 0 ? Math.min(...future) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshAt.join(',')]);

  useEffect(() => {
    if (nextBoundary === null) {
      return;
    }
    const delay = nextBoundary - Date.now();
    if (delay <= 0 || delay > MAX_TIMEOUT_MS) {
      return;
    }
    // Fire a moment after the boundary so the server-side clock has crossed it.
    const timeout = setTimeout(() => refreshData('scheduled'), delay + 1000);
    return () => clearTimeout(timeout);
  }, [nextBoundary, refreshData]);
}

function useNotifications() {
  const toast = useToast();
  const { user } = useAuth();
  const { subscribe, unsubscribe } = usePusher();

  // Show in-app toast notifications via Pusher (for real-time updates)
  // Push notifications are now sent from the server via VAPID
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
        if (notification.userIds.includes(user?._id || '')) {
          toast.show({
            title: notification.title,
            message: notification.message,
            variant: 'info',
            timeout: 10_000,
          });
        }
      });
    };
    channel.bind('notification', notificationHandler);

    return () => {
      channel.unbind('notification', notificationHandler);
      unsubscribe(PUSHER_NOTIFICATIONS);
    };
  }, [subscribe, toast, unsubscribe, user?._id]);
}
