'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { Channel, Members, PresenceChannel } from 'pusher-js';
import { usePusher } from '@/lib/PusherContext';
import { venueChannelName } from '@/lib/venuePresence';
import { ROOM_HALF } from './stations';
import {
  receiveExpression,
  setExpressionBroadcaster,
  type OutgoingExpression,
} from './expressions';

/**
 * Who's in the venue right now, and where they are.
 *
 * Built on a Pusher presence channel per league: Pusher tracks who's
 * connected, and players tell each other where they're walking and what
 * they're emoting with client events (browser to browser; the user id on each
 * one is stamped by Pusher, so it can't be faked). If any of it is
 * unavailable, nothing here throws: everyone just shows as offline.
 */

const POSITION_EVERY_MS = 250; // 4/s, well under Pusher's 10/s client limit

type Spot = { x: number; z: number; at: number };

let channel: PresenceChannel | null = null;
const online = new Set<string>();
let onlineSnapshot: ReadonlySet<string> = new Set();
const spots = new Map<string, Spot>();
const listeners = new Set<() => void>();

function publishOnline() {
  onlineSnapshot = new Set(online);
  listeners.forEach((listener) => listener());
}

/** Ids of everyone in the venue right now (including you). */
export function useOnline(): ReadonlySet<string> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => onlineSnapshot,
    () => onlineSnapshot,
  );
}

/** Where another player last said they were (read from the 3D loop). */
export function getRemoteSpot(userId: string): Spot | undefined {
  return spots.get(userId);
}

/* --------------------------- sending ----------------------------------- */

let lastLocal: { x: number; z: number } | null = null;
let lastSent: { x: number; z: number; at: number } | null = null;

function send(event: string, data: unknown) {
  if (!channel) {
    return;
  }
  try {
    channel.trigger(event, data);
  } catch {
    // client events switched off in Pusher, or not connected: stay quiet
  }
}

/**
 * Called every frame with where you are; sends it at most a few times a
 * second, and only when you've moved.
 */
export function reportPosition(x: number, z: number) {
  lastLocal = { x, z };
  const now = Date.now();
  if (
    lastSent &&
    (now - lastSent.at < POSITION_EVERY_MS ||
      Math.hypot(lastSent.x - x, lastSent.z - z) < 0.05)
  ) {
    return;
  }
  lastSent = { x, z, at: now };
  send('client-pos', { x: round(x), z: round(z) });
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/** Tell everyone (in particular someone who just arrived) where you are. */
function announce() {
  if (lastLocal) {
    lastSent = { ...lastLocal, at: Date.now() };
    send('client-pos', { x: round(lastLocal.x), z: round(lastLocal.z) });
  }
}

/* --------------------------- receiving --------------------------------- */

function isCoordinate(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Math.abs(value) <= ROOM_HALF + 1
  );
}

function senderOf(metadata: unknown): string | null {
  const id = (metadata as { user_id?: unknown } | undefined)?.user_id;
  return typeof id === 'string' ? id : null;
}

/** Joins the league's venue channel while the venue is open. */
export function useLivePresence(leagueId: string, userId: string) {
  const { pusher } = usePusher();

  useEffect(() => {
    if (!pusher) {
      return;
    }
    const name = venueChannelName(leagueId);
    const presence = pusher.subscribe(name) as PresenceChannel;

    const reset = () => {
      online.clear();
      spots.clear();
      publishOnline();
    };

    presence.bind('pusher:subscription_succeeded', (members: Members) => {
      channel = presence;
      online.clear();
      members.each((member: { id: string }) => online.add(member.id));
      publishOnline();
      announce();
    });
    presence.bind('pusher:subscription_error', () => {
      channel = null;
      reset();
    });
    presence.bind('pusher:member_added', (member: { id: string }) => {
      online.add(member.id);
      publishOnline();
      // so the newcomer sees you where you are, not at your usual spot
      announce();
    });
    presence.bind('pusher:member_removed', (member: { id: string }) => {
      online.delete(member.id);
      spots.delete(member.id);
      publishOnline();
    });
    presence.bind(
      'client-pos',
      (data: { x?: unknown; z?: unknown }, metadata: unknown) => {
        const from = senderOf(metadata);
        if (!from || from === userId || !isCoordinate(data?.x) || !isCoordinate(data?.z)) {
          return;
        }
        spots.set(from, { x: data.x, z: data.z, at: Date.now() });
      },
    );
    presence.bind('client-express', (data: unknown, metadata: unknown) => {
      const from = senderOf(metadata);
      if (from && from !== userId) {
        receiveExpression(from, data);
      }
    });

    setExpressionBroadcaster((expression: OutgoingExpression) =>
      send('client-express', expression),
    );

    return () => {
      setExpressionBroadcaster(null);
      (presence as Channel).unbind_all();
      pusher.unsubscribe(name);
      if (channel === presence) {
        channel = null;
      }
      lastSent = null;
      reset();
    };
  }, [pusher, leagueId, userId]);
}
