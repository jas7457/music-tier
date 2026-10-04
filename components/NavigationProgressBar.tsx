'use client';

import { useIsNavigating } from '@/lib/NavigationProgressContext';

/**
 * Thin indeterminate bar pinned to the top of the screen while a navigation
 * is loading. It fades in after a short delay so instant navigations don't
 * flash it.
 */
export function NavigationProgressBar() {
  const isNavigating = useIsNavigating();
  if (!isNavigating) {
    return null;
  }
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="nav-progress fixed top-0 inset-x-0 z-100 h-[3px] overflow-hidden pointer-events-none"
    >
      <div className="nav-progress-bar h-full w-1/3 rounded-full bg-primary" />
    </div>
  );
}
