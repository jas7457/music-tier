'use client';

import { LeagueStandings } from '@/components/LeagueStandings';
import type { PanelProps } from './types';

/** The lineup wall: league standings. */
export function LineupPanel({ league }: PanelProps) {
  return (
    <div className="venue-panel">
      <LeagueStandings league={league} />
    </div>
  );
}
