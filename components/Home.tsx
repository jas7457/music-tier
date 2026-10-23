'use client';

import Card from './Card';

/**
 * Shown to signed-in people who aren't in any league yet. Everyone else lands
 * in their current league's venue (components/venue/Venue.tsx).
 */
export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-lightest text-2xl">
          🎧
        </div>
        <h2 className="text-xl font-semibold mb-2">No Leagues Yet</h2>
        <p className="text-ink-muted max-w-sm mx-auto">
          You&apos;re not part of any leagues yet. Create or join one to get
          started!
        </p>
      </Card>
    </div>
  );
}
