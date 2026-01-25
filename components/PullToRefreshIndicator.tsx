'use client';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  shouldTriggerRefresh: boolean;
}

const MAX_PULL_DISTANCE = 80;

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
      <div
        className="bg-white rounded-full shadow-lg p-3 mt-4 text-primary"
        style={{
          opacity: opacity,
          transition: 'opacity 0.2s ease-out',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isRefreshing ? 'animate-spin' : ''}
          style={{
            transition: isRefreshing ? 'none' : 'transform 0.1s linear',
            color: shouldTriggerRefresh ? 'currentColor' : '#6b7280',
          }}
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </div>
    </div>
  );
}
