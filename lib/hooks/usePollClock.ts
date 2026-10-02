'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PopulatedPoll } from '@/lib/types';
import { getPollStatus } from '@/lib/utils/pollStatus';

/**
 * Ticks "now" every 30s so countdowns stay fresh, and refreshes the route when
 * any poll's derived status changes (e.g. it closes while the page is open),
 * so the server can reveal results.
 */
export function usePollClock(polls: PopulatedPoll[], initialNow: number) {
  const router = useRouter();
  const [now, setNow] = useState(initialNow);
  const refreshedFor = useRef<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const stale = polls.filter(
      (poll) => getPollStatus(poll, now) !== poll.status,
    );
    if (stale.length === 0) {
      return;
    }
    const key = stale.map((poll) => poll._id).join(',');
    if (refreshedFor.current === key) {
      return;
    }
    // Give the server clock a moment to cross the boundary too.
    const timeout = setTimeout(() => {
      refreshedFor.current = key;
      router.refresh();
    }, 1500);
    return () => clearTimeout(timeout);
  }, [now, polls, router]);

  return now;
}

/** "2d 4h", "5h 12m", "3m", "<1m" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return '<1m';
}
