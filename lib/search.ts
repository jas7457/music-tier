import type { TrackInfo } from '@/databaseTypes';
import type { PopulatedLeague } from './types';

// Each section is capped so a broad query (e.g. a single common letter pair)
// still returns a small payload.
const MAX_RESULTS_PER_SECTION = 25;
const MIN_QUERY_LENGTH = 2;

type RoundRef = {
  roundId: string;
  leagueId: string;
};

export type SearchResults = {
  artistResults: Array<
    RoundRef & { trackInfo: TrackInfo; matchedArtist: string }
  >;
  songResults: Array<RoundRef & { trackInfo: TrackInfo }>;
  roundResults: Array<
    RoundRef & {
      roundTitle: string;
      leagueTitle: string;
      // only set when the match was in the description, not the title
      descriptionMatch?: string;
    }
  >;
};

export const EMPTY_SEARCH_RESULTS: SearchResults = {
  artistResults: [],
  songResults: [],
  roundResults: [],
};

function getDescriptionExcerpt(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 100) + (text.length > 100 ? '…' : '');
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 60);
  return (
    (start > 0 ? '…' : '') +
    text.slice(start, end) +
    (end < text.length ? '…' : '')
  );
}

/**
 * Searches songs, artists and rounds in the completed rounds of the given
 * leagues. Runs on the server so the client never downloads every league.
 */
export function searchLeagues(
  leagues: PopulatedLeague[],
  rawQuery: string,
): SearchResults {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < MIN_QUERY_LENGTH) {
    return EMPTY_SEARCH_RESULTS;
  }

  const entries: Array<RoundRef & { trackInfo: TrackInfo }> = [];
  const roundResults: SearchResults['roundResults'] = [];

  for (const league of leagues) {
    for (const round of league.rounds.completed) {
      const ref = { roundId: round._id, leagueId: league._id };
      for (const submission of round.submissions) {
        entries.push({ ...ref, trackInfo: submission.trackInfo });
      }

      const inTitle = round.title.toLowerCase().includes(q);
      const inDescription = round.description.toLowerCase().includes(q);
      if (inTitle || inDescription) {
        roundResults.push({
          ...ref,
          roundTitle: round.title,
          leagueTitle: league.title,
          ...(!inTitle && inDescription
            ? { descriptionMatch: getDescriptionExcerpt(round.description, q) }
            : {}),
        });
      }
    }
  }

  // Artist results — one entry per song where any artist matches, dedup by trackId
  const seenArtistTracks = new Set<string>();
  const artistResults: SearchResults['artistResults'] = [];
  for (const entry of entries) {
    const matchedArtist = entry.trackInfo.artists.find((artist) =>
      artist.toLowerCase().includes(q),
    );
    if (matchedArtist && !seenArtistTracks.has(entry.trackInfo.trackId)) {
      seenArtistTracks.add(entry.trackInfo.trackId);
      artistResults.push({ ...entry, matchedArtist });
    }
  }
  artistResults.sort((a, b) => {
    const artistCmp = a.matchedArtist.localeCompare(b.matchedArtist);
    if (artistCmp !== 0) return artistCmp;
    return a.trackInfo.title.localeCompare(b.trackInfo.title);
  });

  // Song results — deduplicate by trackId
  const seenTracks = new Set<string>();
  const songResults: SearchResults['songResults'] = [];
  for (const entry of entries) {
    if (
      entry.trackInfo.title.toLowerCase().includes(q) &&
      !seenTracks.has(entry.trackInfo.trackId)
    ) {
      seenTracks.add(entry.trackInfo.trackId);
      songResults.push(entry);
    }
  }

  return {
    artistResults: artistResults.slice(0, MAX_RESULTS_PER_SECTION),
    songResults: songResults.slice(0, MAX_RESULTS_PER_SECTION),
    roundResults: roundResults.slice(0, MAX_RESULTS_PER_SECTION),
  };
}
