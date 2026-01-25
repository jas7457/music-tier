import type { PopulatedLeague, PopulatedRound } from '../types';

export function getAllRounds(
  league: PopulatedLeague,
  { includeFake = true }: { includeFake?: boolean } = {},
): PopulatedRound[] {
  return [
    ...league.rounds.kickoff,
    ...(league.rounds.current ? [league.rounds.current] : []),
    ...league.rounds.upcoming,
    ...league.rounds.completed,
    ...league.rounds.bonus,
  ].filter((round) => {
    if (includeFake) {
      return true;
    }
    return Boolean(round._id);
  });
}
