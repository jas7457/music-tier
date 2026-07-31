'use client';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  shouldTriggerRefresh: boolean;
}

const MAX_PULL_DISTANCE = 80;

/** The 16-colour hourglass. It flips rather than spins while busy. */
function HourglassIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={spinning ? 'animate-spin' : ''}
      style={{ animationDuration: '1.2s' }}
    >
      <rect x="3" y="1" width="10" height="1" fill="#000" />
      <rect x="3" y="14" width="10" height="1" fill="#000" />
      <path
        d="M4 2h8v2l-3 3v2l3 3v2H4v-2l3-3V7L4 4z"
        fill="#fff"
        stroke="#000"
      />
      <path d="M5 3h6v1L8 7 5 4z" fill="#0000c0" />
      <path d="M6.5 11h3l1.5 2H5z" fill="#ffd400" />
    </svg>
  );
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  shouldTriggerRefresh,
}: PullToRefreshIndicatorProps) {
  const opacity = Math.min(pullDistance / MAX_PULL_DISTANCE, 1);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all 0.3s ease-out"
      style={{
        transform: `translateY(${Math.min(pullDistance, MAX_PULL_DISTANCE)}px)`,
      }}
    >
      {/* The wait cursor, as a status panel. */}
      <div
        className="w98-raised px-3 py-1.5 mt-2 flex items-center gap-2 text-sm"
        style={{
          opacity: opacity,
          transition: 'opacity 0.2s ease-out',
        }}
      >
        <HourglassIcon spinning={isRefreshing} />
        {isRefreshing
          ? 'Refreshing…'
          : shouldTriggerRefresh
            ? 'Release to refresh'
            : 'Pull down to refresh'}
      </div>
    </div>
  );
}
