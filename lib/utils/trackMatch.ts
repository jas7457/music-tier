import type { TrackInfo } from '@/databaseTypes';

// Words that mark a " - …" suffix as describing the release rather than being
// part of the song's name, e.g. "- Remastered 2011", "- Live at Glastonbury".
const VERSION_SUFFIX =
  /\b(remaster(ed)?|remix(ed)?|mix|live|acoustic|unplugged|radio edit|edit|version|mono|stereo|demo|single|instrumental|re-?recorded|deluxe|bonus track|session)\b|\b(19|20)\d{2}\b/;

/**
 * Lower-cased title with release noise stripped, so different releases of
 * the same song compare equal:
 * - any (…) or […] group: "(Remastered 2015)", "(feat. X)", "(Taylor's Version)"
 * - a " - …" suffix naming a version: "- 2011 Remaster", "- Live", "- Radio Edit"
 * - a trailing "feat. X"
 * Hyphens inside a title ("Self-Esteem") and other " - " parts
 * ("Pt. 2 - The Return") are kept.
 */
export function getSimplifiedTitle(trackInfo: TrackInfo) {
  let title = trackInfo.title.toLowerCase();

  title = title.replace(/\s*[(\[][^)\]]*[)\]]/g, ' ');

  const parts = title.split(/\s+-\s+/);
  const versionIndex = parts.findIndex(
    (part, index) => index > 0 && VERSION_SUFFIX.test(part),
  );
  if (versionIndex !== -1) {
    title = parts.slice(0, versionIndex).join(' - ');
  }

  title = title.replace(/\s+(feat\.?|featuring|ft\.?)\s+.*$/, '');

  return title.trim().replace(/\s+/g, ' ');
}

export type TrackMatchReason =
  | 'EXACT_MATCH'
  | 'TITLE_AND_ARTIST_MATCH'
  | 'ARTIST_MATCH';

/**
 * How closely two tracks match, used to catch duplicate submissions:
 * - EXACT_MATCH: same Spotify track, or identical title with a shared artist
 * - TITLE_AND_ARTIST_MATCH: same simplified title with a shared artist
 * - ARTIST_MATCH: only an artist in common
 */
export function getTrackMatchReason(
  a: TrackInfo,
  b: TrackInfo,
): TrackMatchReason | null {
  if (a.trackId === b.trackId) {
    return 'EXACT_MATCH';
  }

  const atLeastOneArtistMatches = a.artists.some((artist) =>
    b.artists.includes(artist),
  );

  if (a.title === b.title && atLeastOneArtistMatches) {
    return 'EXACT_MATCH';
  }

  if (
    getSimplifiedTitle(a) === getSimplifiedTitle(b) &&
    atLeastOneArtistMatches
  ) {
    return 'TITLE_AND_ARTIST_MATCH';
  }

  if (atLeastOneArtistMatches) {
    return 'ARTIST_MATCH';
  }

  return null;
}
