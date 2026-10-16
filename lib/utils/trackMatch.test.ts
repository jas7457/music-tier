import { describe, expect, it } from 'vitest';
import type { TrackInfo } from '@/databaseTypes';
import { getSimplifiedTitle, getTrackMatchReason } from './trackMatch';

const track = (
  title: string,
  artists: string[],
  trackId = `id-${title}-${artists.join()}`,
): TrackInfo => ({
  trackId,
  title,
  artists,
  albumName: 'Album',
  albumImageUrl: '',
});

describe('getSimplifiedTitle', () => {
  it.each([
    ['Hey Jude (Remastered 2015)', 'hey jude'],
    ['Hey Jude - 2015 Remaster', 'hey jude'],
    ['Wonderwall - Remastered', 'wonderwall'],
    ['Song 2 - 2012 Remaster', 'song 2'],
    ['Bohemian Rhapsody - Remastered 2011', 'bohemian rhapsody'],
    ['Self-Esteem - Remastered', 'self-esteem'],
    ['Creep - Acoustic', 'creep'],
    ['Bad Guy - Live', 'bad guy'],
    ['Hello - Radio Edit', 'hello'],
    ['Take On Me - 2017 Acoustic', 'take on me'],
    ['Hurt - Live at Glastonbury', 'hurt'],
    ['Blinding Lights (feat. Rosalía) - Remix', 'blinding lights'],
    ['Old Town Road (feat. Billy Ray Cyrus) - Remix', 'old town road'],
    ['Get Lucky (feat. Pharrell Williams)', 'get lucky'],
    ['Get Lucky feat. Pharrell Williams', 'get lucky'],
    ['Stay (with Justin Bieber)', 'stay'],
    ["Love Story (Taylor's Version)", 'love story'],
    [
      "All Too Well (10 Minute Version) (Taylor's Version) (From The Vault)",
      'all too well',
    ],
  ])('strips version noise: %s', (title, expected) => {
    expect(getSimplifiedTitle(track(title, []))).toBe(expected);
  });

  it.each([
    ['Mr. Brightside', 'mr. brightside'],
    ['Live Forever', 'live forever'],
    ['Mix Tape', 'mix tape'],
    ['Clean', 'clean'],
    ['Self-Esteem', 'self-esteem'],
    ['Ex-Factor', 'ex-factor'],
    ['Re-Mixed Up', 're-mixed up'],
    ['Pt. 2 - The Return', 'pt. 2 - the return'],
  ])('leaves ordinary titles alone: %s', (title, expected) => {
    expect(getSimplifiedTitle(track(title, []))).toBe(expected);
  });
});

describe('getTrackMatchReason', () => {
  const heyJude = track('Hey Jude', ['The Beatles'], 'spotify-1');

  it('is an exact match for the same Spotify track', () => {
    expect(
      getTrackMatchReason(heyJude, track('Anything', ['Anyone'], 'spotify-1')),
    ).toBe('EXACT_MATCH');
  });

  it('is an exact match for the same title with a shared artist', () => {
    expect(
      getTrackMatchReason(
        heyJude,
        track('Hey Jude', ['The Beatles', 'Someone'], 'spotify-2'),
      ),
    ).toBe('EXACT_MATCH');
  });

  it('matches title and artist across versions of the same song', () => {
    expect(
      getTrackMatchReason(
        heyJude,
        track('Hey Jude - 2015 Remaster', ['The Beatles']),
      ),
    ).toBe('TITLE_AND_ARTIST_MATCH');
  });

  it('matches a "- Remastered YYYY" release to the original', () => {
    expect(
      getTrackMatchReason(
        track('Bohemian Rhapsody', ['Queen']),
        track('Bohemian Rhapsody - Remastered 2011', ['Queen']),
      ),
    ).toBe('TITLE_AND_ARTIST_MATCH');
  });

  it('compares titles case-insensitively only after simplifying', () => {
    expect(
      getTrackMatchReason(heyJude, track('hey jude', ['The Beatles'])),
    ).toBe('TITLE_AND_ARTIST_MATCH');
  });

  it('is an artist match when only an artist is shared', () => {
    expect(
      getTrackMatchReason(heyJude, track('Let It Be', ['The Beatles'])),
    ).toBe('ARTIST_MATCH');
  });

  it('is no match for the same title by a different artist', () => {
    expect(
      getTrackMatchReason(heyJude, track('Hey Jude', ['Wilson Pickett'])),
    ).toBeNull();
  });

  it('is no match for unrelated tracks', () => {
    expect(getTrackMatchReason(heyJude, track('Africa', ['Toto']))).toBeNull();
  });
});
