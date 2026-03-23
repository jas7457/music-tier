'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { PopulatedLeague } from '@/lib/types';
import AlbumArt from './AlbumArt';
import { getAllRounds } from '@/lib/utils/getAllRounds';
import type { PopulatedRound } from '@/lib/types';
import type { TrackInfo } from '@/databaseTypes';

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
      <mark key={idx} className="bg-yellow-200 text-inherit rounded-sm px-0">
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
      const rounds = getAllRounds(league, { includeFake: false });
      for (const round of rounds) {
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
    <div ref={containerRef} className="relative mb-6">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search artists, songs, or rounds…"
          className="w-full px-4 py-3 pl-10 pr-9 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800 placeholder-gray-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-[70vh] overflow-y-auto">
          {!hasResults ? (
            <div className="p-5 text-gray-400 text-center text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Artist Section */}
              {results!.artistResults.length > 0 && (
                <section className="p-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Artist
                  </h3>
                  <div className="space-y-1">
                    {results!.artistResults.map(
                      ({ trackInfo, round, league, matchedArtist }) => (
                        <Link
                          key={`artist-${matchedArtist}-${round._id}`}
                          href={`/leagues/${league._id}/rounds/${round._id}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <AlbumArt
                            trackInfo={trackInfo}
                            round={round}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {highlight(matchedArtist, query)}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
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
                <section className="p-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Song
                  </h3>
                  <div className="space-y-1">
                    {results!.songResults.map(
                      ({ trackInfo, round, league }) => (
                        <Link
                          key={`song-${trackInfo.trackId}-${round._id}`}
                          href={`/leagues/${league._id}/rounds/${round._id}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <AlbumArt
                            trackInfo={trackInfo}
                            round={round}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {highlight(trackInfo.title, query)}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
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
                <section className="p-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Round
                  </h3>
                  <div className="space-y-1">
                    {results!.roundResults.map(
                      ({ round, league, matchInDescription }) => (
                        <Link
                          key={`round-${round._id}`}
                          href={`/leagues/${league._id}/rounds/${round._id}`}
                          onClick={() => setIsOpen(false)}
                          className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900">
                            {highlight(round.title, query)}
                          </div>
                          {matchInDescription && (
                            <div className="text-sm text-gray-500 mt-0.5">
                              {highlight(
                                getDescriptionExcerpt(round.description, query),
                                query,
                              )}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-0.5">
                            {league.title}
                          </div>
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
