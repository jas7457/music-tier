'use client';

import { useSyncExternalStore } from 'react';

const EVENT = 'venue-reveal-seen';

const keyFor = (userId: string, roundId: string) =>
  `tier:results-revealed:${userId}:${roundId}`;

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

/** Whether this user already sat through the reveal for this round. */
export function useRevealSeen(userId: string, roundId: string) {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(keyFor(userId, roundId)) ? 'seen' : 'new';
      } catch {
        return 'seen';
      }
    },
    () => 'unknown',
  );
}

export function markRevealSeen(userId: string, roundId: string) {
  try {
    localStorage.setItem(keyFor(userId, roundId), '1');
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}
