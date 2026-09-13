import type { PopulatedLeague } from '../types';

/**
 * The upcoming phase-boundary timestamps for a league — when submissions/voting
 * open or close and when the next round starts. `useRealTimeUpdates` uses these
 * to refetch exactly when a stage flips over on the clock, which matters most
 * for leagues with auto-start disabled (nothing else broadcasts the change).
 */
export function getLeagueRefreshBoundaries(league: PopulatedLeague): number[] {
  const boundaries: number[] = [];

  const current = league.rounds.current;
  if (current) {
    boundaries.push(
      current.submissionStartDate,
      current.submissionEndDate,
      current.votingStartDate,
      current.votingEndDate,
    );
  }

  // The moment the next round opens for submissions.
  for (const round of league.rounds.upcoming) {
    boundaries.push(round.submissionStartDate);
  }

  return boundaries.filter((ts) => Number.isFinite(ts));
}

export function getLeaguesRefreshBoundaries(
  leagues: PopulatedLeague[],
): number[] {
  return leagues.flatMap(getLeagueRefreshBoundaries);
}
