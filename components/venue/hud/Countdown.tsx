'use client';

import { useEffect, useState } from 'react';

export function formatCountdown(ms: number) {
  if (ms <= 0) {
    return 'now';
  }
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${Math.max(1, mins)}m`;
}

/** Live "2d 4h" style countdown, re-rendering once a minute. */
export function Countdown({
  to,
  className,
}: {
  to: number;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  if (now === null) {
    return <span className={className}>…</span>;
  }
  return <span className={className}>{formatCountdown(to - now)}</span>;
}
