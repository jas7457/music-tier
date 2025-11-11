"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PusherClient from "pusher-js";
import type { Channel } from "pusher-js";
import {
  PUSHER_CHANNEL_NAME,
  PUSHER_CLUSTER,
  PUSHER_PUBLIC_KEY,
} from "./utils/constants";

type PusherContextType = {
  pusher: PusherClient | null;
  subscribe: (channelName: string) => Channel | null;
  unsubscribe: (channelName: string) => void;
};

const PusherContext = createContext<PusherContextType>({
  pusher: null,
  subscribe: () => null,
  unsubscribe: () => {},
});

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
  return useContext(PusherContext);
}

// Hook for subscribing to updates
export function useRealTimeUpdates() {
  const router = useRouter();

  const { subscribe, unsubscribe } = usePusher();
  const updateRef = useRef(() => router.refresh());
  updateRef.current = () => router.refresh();

  useEffect(() => {
    const channel = subscribe(PUSHER_CHANNEL_NAME);
    if (!channel) {
      return;
    }

    const updateCb = () => {
      updateRef.current();
    };

    channel.bind("update", updateCb);

    return () => {
      channel.unbind("update", updateCb);
      unsubscribe(PUSHER_CHANNEL_NAME);
    };
  }, [subscribe, unsubscribe]);
}
