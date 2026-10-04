'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';

/**
 * Tracks in-flight navigations so a progress bar can show while the current
 * page stays on screen (instead of swapping in a loading.tsx skeleton).
 *
 * Sources report themselves while pending:
 * - <Link>s, via useLinkStatus (see components/AppLink.tsx)
 * - programmatic navigations, via useTrackedRouter below
 */
type Reporter = {
  start: () => void;
  stop: () => void;
};

const ReporterContext = createContext<Reporter>({
  start: () => {},
  stop: () => {},
});
// Kept separate from the reporter so links don't re-render when the count changes.
const PendingContext = createContext(false);

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingCount, setPendingCount] = useState(0);
  const start = useCallback(() => setPendingCount((count) => count + 1), []);
  const stop = useCallback(
    () => setPendingCount((count) => Math.max(0, count - 1)),
    [],
  );
  const reporter = useMemo(() => ({ start, stop }), [start, stop]);

  return (
    <ReporterContext.Provider value={reporter}>
      <PendingContext.Provider value={pendingCount > 0}>
        {children}
      </PendingContext.Provider>
    </ReporterContext.Provider>
  );
}

/** Whether any navigation is currently in flight. */
export function useIsNavigating() {
  return useContext(PendingContext);
}

/** Reports `pending` to the progress bar for as long as it's true. */
export function useReportPending(pending: boolean) {
  const { start, stop } = useContext(ReporterContext);
  useEffect(() => {
    if (!pending) {
      return;
    }
    start();
    return stop;
  }, [pending, start, stop]);
}

/**
 * `router.push` / `router.refresh` that show the progress bar until the new
 * page has rendered. Use for user-initiated navigations; background refreshes
 * (real-time updates, timers) should use the plain router.
 */
export function useTrackedRouter() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  useReportPending(isPending);

  return useMemo(
    () => ({
      push: (href: string) => startTransition(() => router.push(href)),
      refresh: () => startTransition(() => router.refresh()),
    }),
    [router],
  );
}
