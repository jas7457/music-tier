'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { PopulatedLeague } from '@/lib/types';
import AlbumArt from './AlbumArt';
import type { PopulatedRound } from '@/lib/types';
import type { TrackInfo } from '@/databaseTypes';
import { SearchIcon } from './win98/Icons';
import { W98Button } from './win98/Controls';

type SearchEntry = {
  trackInfo: TrackInfo;
  round: PopulatedRound;
  league: PopulatedLeague;
};

type RoundEntry = {
  round: PopulatedRound;
  league: PopulatedLeague;
};

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: ReactNode[] = [];
  let last = 0;
  let idx = lower.indexOf(lowerQuery, last);
  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(
      <mark key={idx} className="bg-[#ffff00] text-black px-0">
        {text.slice(idx, idx + query.length)}
      </mark>,
    );
    last = idx + query.length;
    idx = lower.indexOf(lowerQuery, last);
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

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

export function SearchBar({ leagues }: { leagues: PopulatedLeague[] }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isOpen) {
          setIsOpen(false);
        } else {
          setQuery('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const { allEntries, allRoundEntries } = useMemo(() => {
    const allEntries: SearchEntry[] = [];
    const allRoundEntries: RoundEntry[] = [];

    for (const league of leagues) {
      for (const round of league.rounds.completed) {
        allRoundEntries.push({ round, league });
        for (const submission of round.submissions) {
          allEntries.push({ trackInfo: submission.trackInfo, round, league });
        }
      }
    }

    return { allEntries, allRoundEntries };
  }, [leagues]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return null;

    // Artist results — one entry per song where any artist matches, dedup by trackId
    const seenArtistTracks = new Set<string>();
    const artistResults: (SearchEntry & { matchedArtist: string })[] = [];
    for (const entry of allEntries) {
      const matchedArtist = entry.trackInfo.artists.find((a) =>
        a.toLowerCase().includes(q),
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
    const songResults: SearchEntry[] = [];
    for (const entry of allEntries) {
      if (
        entry.trackInfo.title.toLowerCase().includes(q) &&
        !seenTracks.has(entry.trackInfo.trackId)
      ) {
        seenTracks.add(entry.trackInfo.trackId);
        songResults.push(entry);
      }
    }

    // Round results
    const roundResults: (RoundEntry & { matchInDescription: boolean })[] = [];
    for (const entry of allRoundEntries) {
      const inTitle = entry.round.title.toLowerCase().includes(q);
      const inDescription = entry.round.description.toLowerCase().includes(q);
      if (inTitle || inDescription) {
        roundResults.push({
          ...entry,
          matchInDescription: !inTitle && inDescription,
        });
      }
    }

    return { artistResults, songResults, roundResults };
  }, [query, allEntries, allRoundEntries]);

  const hasResults =
    results &&
    (results.artistResults.length > 0 ||
      results.songResults.length > 0 ||
      results.roundResults.length > 0);

  const showDropdown = isOpen && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative mb-2">
      {/* Explorer's Find toolbar. */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="w98-find"
          className="flex-none items-center gap-1 hidden sm:flex"
        >
          <SearchIcon />
          Find:
        </label>
        <input
          id="w98-find"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Artists, songs, or rounds…"
          className="grow min-w-0 w98-field"
        />
        <W98Button
          size="sm"
          disabled={!query}
          onClick={() => {
            setQuery('');
            setIsOpen(false);
            inputRef.current?.focus();
          }}
          className="flex-none"
        >
          Clear
        </W98Button>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-0.5 w98-raised z-50 max-h-[70vh] overflow-y-auto animate-menu-in p-0.5">
          {!hasResults ? (
            <div className="p-4 text-center text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="w98-paper divide-y divide-w98-face">
              {/* Artist Section */}
              {results!.artistResults.length > 0 && (
                <section className="p-1.5">
                  <h3 className="text-xs font-bold uppercase mb-1 px-1 bg-w98-face">
                    Artist
                  </h3>
                  <div className="space-y-1">
                    {results!.artistResults.map(
                      ({ trackInfo, round, league, matchedArtist }) => (
                        <Link
                          key={`artist-${matchedArtist}-${round._id}`}
                          href={`/leagues/${league._id}/rounds/${round._id}`}
                          onClick={() => setIsOpen(false)}
                          className="w98-row flex items-center gap-2 no-underline text-black"
                        >
                          <AlbumArt
                            trackInfo={trackInfo}
                            round={round}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="font-bold truncate">
                              {highlight(matchedArtist, query)}
                            </div>
                            <div className="text-sm truncate">
                              {trackInfo.title}
                            </div>
                          </div>
                        </Link>
                      ),
                    )}
                  </div>
                </section>
              )}

              {/* Song Section */}
              {results!.songResults.length > 0 && (
                <section className="p-1.5">
                  <h3 className="text-xs font-bold uppercase mb-1 px-1 bg-w98-face">
                    Song
                  </h3>
                  <div className="space-y-1">
                    {results!.songResults.map(
                      ({ trackInfo, round, league }) => (
                        <Link
                          key={`song-${trackInfo.trackId}-${round._id}`}
                          href={`/leagues/${league._id}/rounds/${round._id}`}
                          onClick={() => setIsOpen(false)}
                          className="w98-row flex items-center gap-2 no-underline text-black"
                        >
                          <AlbumArt
                            trackInfo={trackInfo}
                            round={round}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="font-bold truncate">
                              {highlight(trackInfo.title, query)}
                            </div>
                            <div className="text-sm truncate">
                              {trackInfo.artists.join(', ')}
                            </div>
                          </div>
                        </Link>
                      ),
                    )}
                  </div>
                </section>
              )}

              {/* Round Section */}
              {results!.roundResults.length > 0 && (
                <section className="p-1.5">
                  <h3 className="text-xs font-bold uppercase mb-1 px-1 bg-w98-face">
                    Round
                  </h3>
                  <div className="space-y-1">
                    {results!.roundResults.map(
                      ({ round, league, matchInDescription }) => (
                        <Link
                          key={`round-${round._id}`}
                          href={`/leagues/${league._id}/rounds/${round._id}`}
                          onClick={() => setIsOpen(false)}
                          className="w98-row block no-underline text-black"
                        >
                          <div className="font-bold">
                            {highlight(round.title, query)}
                          </div>
                          {matchInDescription && (
                            <div className="text-sm mt-0.5">
                              {highlight(
                                getDescriptionExcerpt(round.description, query),
                                query,
                              )}
                            </div>
                          )}
                          <div className="text-xs mt-0.5">{league.title}</div>
                        </Link>
                      ),
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
