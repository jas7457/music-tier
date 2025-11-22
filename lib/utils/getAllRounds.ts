import type { PopulatedLeague, PopulatedRound } from "../types";

export function getAllRounds(
  league: PopulatedLeague,
  {
    includePending = false,
    includeFake = true,
  }: { includePending?: boolean; includeFake?: boolean } = {}
): PopulatedRound[] {
  return [
    ...(league.rounds.current ? [league.rounds.current] : []),
    ...league.rounds.upcoming,
    ...league.rounds.completed,
    ...league.rounds.bonus,
    ...(includePending ? league.rounds.pending : []),
  ].filter((round) => {
    if (includeFake) {
      return true;
    }
    return Boolean(round._id);
  });
}
