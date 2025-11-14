import type { PopulatedLeague, PopulatedRound } from "../types";

export function getAllRounds(league: PopulatedLeague): PopulatedRound[] {
  return [
    ...(league.rounds.current ? [league.rounds.current] : []),
    ...league.rounds.upcoming,
    ...league.rounds.completed,
    ...league.rounds.bonus,
  ];
}
