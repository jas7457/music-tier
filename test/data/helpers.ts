import type { User } from '@/databaseTypes';
import { getHomeLeagues } from '@/lib/data';
import type { PopulatedLeague, PopulatedRound } from '@/lib/types';
import { getAllRounds } from '@/lib/utils/getAllRounds';
import { id } from '../fixtures';

/** The league the home page would show `viewer`. */
export async function loadHomeLeague(viewer: User): Promise<PopulatedLeague> {
  const { currentLeague } = await getHomeLeagues(id(viewer));
  if (!currentLeague) {
    throw new Error('expected the viewer to have a current league');
  }
  return currentLeague;
}

/** Every round the league exposes (all buckets), in play order. */
export function roundsInOrder(league: PopulatedLeague): PopulatedRound[] {
  const all = getAllRounds(league);
  return [...all].sort((a, b) => a.roundIndex - b.roundIndex);
}

export const titles = (
  rounds: Array<{ title: string; creatorObject?: { firstName: string } }>,
) => rounds.map((r) => r.title || `(pending: ${r.creatorObject?.firstName})`);
