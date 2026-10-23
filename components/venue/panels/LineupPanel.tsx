'use client';

import { LineupPoster } from './lineup/LineupPoster';
import type { PanelProps } from './types';

/** The lineup wall: league standings as a festival gig poster. */
export function LineupPanel(props: PanelProps) {
  return (
    <div className="venue-panel">
      <LineupPoster {...props} />
    </div>
  );
}
