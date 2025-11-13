"use client";

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
import { useData } from "./DataContext";
import { PopulatedLeague, PopulatedRound } from "./types";
import { getAllRounds } from "./utils/getAllRounds";
import { useToast } from "./ToastContext";

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

type UpdatesFor = PopulatedLeague | PopulatedRound | PopulatedLeague[];
const isLeagueArray = (updateFor: UpdatesFor): updateFor is PopulatedLeague[] =>
  Array.isArray(updateFor);
const isLeague = (updateFor: UpdatesFor): updateFor is PopulatedLeague =>
  "rounds" in updateFor;
const isRound = (updateFor: UpdatesFor): updateFor is PopulatedRound =>
  "creatorId" in updateFor;

// Hook for subscribing to updates
export function useRealTimeUpdates(updatesFor: UpdatesFor) {
  const { refreshData } = useData();
  const { subscribe, unsubscribe } = usePusher();

  useNotifications(updatesFor);

  useEffect(() => {
    const channel = subscribe(PUSHER_CHANNEL_NAME);
    if (!channel) {
      return;
    }
    const updateHandler = () => {
      refreshData("pusherUpdate");
    };
    channel.bind("update", updateHandler);

    return () => {
      channel.unbind("update", updateHandler);
      unsubscribe(PUSHER_CHANNEL_NAME);
    };
  }, [refreshData, subscribe, unsubscribe]);
}

type NotificationPayload = {
  title: string;
  options?: NotificationOptions;
} | null;

function useNotifications(updatesFor: UpdatesFor) {
  const updatesForRef = useRef<UpdatesFor>(updatesFor);
  const toast = useToast();

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const previousData = updatesForRef.current;
    updatesForRef.current = updatesFor;

    const notificationToSend: NotificationPayload = (() => {
      const isNow = (
        oldValue: string,
        newValue: string,
        checkAgainst: string
      ): boolean => newValue === checkAgainst && oldValue !== checkAgainst;

      const getRoundNotification = (
        previousRound: PopulatedRound,
        newRound: PopulatedRound
      ): NotificationPayload => {
        // a different round is being shown, this is unexpected, no notification
        if (previousRound._id !== newRound._id) {
          return null;
        }

        if (isNow(previousRound.stage, newRound.stage, "completed")) {
          return {
            title: "Round Completed!",
            options: {
              body: `Round ${previousRound.title} has just finished`,
            },
          };
        }

        if (isNow(previousRound.stage, newRound.stage, "voting")) {
          return {
            title: "Voting Started!",
            options: {
              body: `Time to vote on ${previousRound.title}`,
            },
          };
        }
        return null;
      };

      const getLeagueNotificaion = (
        previousLeague: PopulatedLeague,
        newLeague: PopulatedLeague
      ) => {
        if (isNow(previousLeague.status, newLeague.status, "completed")) {
          return {
            title: "League Completed!",
            options: {
              body: `League "${previousLeague.title}" has just wrapped. Check out the final standings!`,
            },
          };
        }

        if (isNow(previousLeague.status, newLeague.status, "active")) {
          return {
            title: "League is Now Active!",
            options: {
              body: `League "${previousLeague.title}" is now active! Time to start submitting your round.`,
            },
          };
        }

        const newRounds = getAllRounds(newLeague);
        const previousRounds = getAllRounds(previousLeague);
        const previousRoundsById = previousRounds.reduce<
          Record<string, PopulatedRound>
        >((acc, round) => {
          acc[round._id] = round;
          return acc;
        }, {});

        for (const newRound of newRounds) {
          const previousRound = previousRoundsById[newRound._id];
          if (!previousRound) {
            continue;
          }
          const roundNotification = getRoundNotification(
            previousRound,
            newRound
          );
          if (roundNotification) {
            return roundNotification;
          }
        }
        return null;
      };

      if (isRound(previousData) && isRound(updatesFor)) {
        return getRoundNotification(previousData, updatesFor);
      }
      if (isLeague(previousData) && isLeague(updatesFor)) {
        return getLeagueNotificaion(previousData, updatesFor);
      }
      if (isLeagueArray(previousData) && isLeagueArray(updatesFor)) {
        const oldLeaguesById = previousData.reduce<
          Record<string, PopulatedLeague>
        >((acc, league) => {
          acc[league._id] = league;
          return acc;
        }, {});

        for (const newLeague of updatesFor) {
          const previousLeague = oldLeaguesById[newLeague._id];
          if (!previousLeague) {
            continue;
          }
          const leagueNotification = getLeagueNotificaion(
            previousLeague,
            newLeague
          );
          if (leagueNotification) {
            return leagueNotification;
          }
        }
      }
      return null;
    })();

    if (notificationToSend) {
      new Notification(notificationToSend.title, notificationToSend.options);
      toast.show({
        message: notificationToSend.options?.body || notificationToSend.title,
        variant: "info",
        dismissible: true,
        timeout: 5000,
      });
    }
  }, [updatesFor, toast]);
}
