'use client';

import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from '@/components/AppLink';
import type { TrackInfo } from '@/databaseTypes';
import type { SearchResults } from '@/lib/search';

const SEARCH_DEBOUNCE_MS = 200;

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
      <mark key={idx} className="bg-amber-200/70 text-inherit rounded-sm px-0">
        {text.slice(idx, idx + query.length)}
      </mark>,
    );
    last = idx + query.length;
    idx = lower.indexOf(lowerQuery, last);
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function SearchBar() {
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

  // Search runs on the server; results are fetched as you type (debounced).
  const [response, setResponse] = useState<{
    query: string;
    results: SearchResults | null;
  }>({ query: '', results: null });
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          throw new Error('Search failed');
        }
        const results: SearchResults = await res.json();
        setResponse({ query: trimmedQuery, results });
      } catch {
        if (!controller.signal.aborted) {
          setResponse({ query: trimmedQuery, results: null });
        }
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery]);

  // Results are only shown for the query they were fetched for.
  const isSearching = response.query !== trimmedQuery;
  const results = isSearching ? null : response.results;

  const hasResults =
    results &&
    (results.artistResults.length > 0 ||
      results.songResults.length > 0 ||
      results.roundResults.length > 0);

  const showDropdown = isOpen && trimmedQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative mb-6">
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none"
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
          className="w-full px-4 py-3.5 pl-10 pr-9 rounded-card field text-ink"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-subtle hover:bg-white/50 hover:text-ink transition-colors"
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
        <div className="absolute top-full left-0 right-0 mt-2 glass-popover rounded-card z-50 max-h-[70vh] overflow-y-auto animate-menu-in">
          {isSearching ? (
            <div className="p-5 text-ink-subtle text-center text-sm">
              Searching…
            </div>
          ) : !hasResults ? (
            <div className="p-5 text-ink-subtle text-center text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="divide-y divide-white/40">
              {/* Artist Section */}
              {results!.artistResults.length > 0 && (
                <section className="p-4">
                  <h3 className="text-[11px] font-semibold text-ink-subtle uppercase tracking-widest mb-2">
                    Artist
                  </h3>
                  <div className="space-y-1">
                    {results!.artistResults.map(
                      ({ trackInfo, roundId, leagueId, matchedArtist }) => (
                        <Link
                          key={`artist-${matchedArtist}-${roundId}`}
                          href={`/leagues/${leagueId}/rounds/${roundId}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-control hover:bg-ink/5 transition-colors"
                        >
                          <Thumbnail trackInfo={trackInfo} />
                          <div className="min-w-0">
                            <div className="font-medium text-ink truncate">
                              {highlight(matchedArtist, query)}
                            </div>
                            <div className="text-sm text-ink-muted truncate">
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
                  <h3 className="text-[11px] font-semibold text-ink-subtle uppercase tracking-widest mb-2">
                    Song
                  </h3>
                  <div className="space-y-1">
                    {results!.songResults.map(
                      ({ trackInfo, roundId, leagueId }) => (
                        <Link
                          key={`song-${trackInfo.trackId}-${roundId}`}
                          href={`/leagues/${leagueId}/rounds/${roundId}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-control hover:bg-ink/5 transition-colors"
                        >
                          <Thumbnail trackInfo={trackInfo} />
                          <div className="min-w-0">
                            <div className="font-medium text-ink truncate">
                              {highlight(trackInfo.title, query)}
                            </div>
                            <div className="text-sm text-ink-muted truncate">
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
                  <h3 className="text-[11px] font-semibold text-ink-subtle uppercase tracking-widest mb-2">
                    Round
                  </h3>
                  <div className="space-y-1">
                    {results!.roundResults.map(
                      ({
                        roundId,
                        leagueId,
                        roundTitle,
                        leagueTitle,
                        descriptionMatch,
                      }) => (
                        <Link
                          key={`round-${roundId}`}
                          href={`/leagues/${leagueId}/rounds/${roundId}`}
                          onClick={() => setIsOpen(false)}
                          className="block p-2 rounded-control hover:bg-ink/5 transition-colors"
                        >
                          <div className="font-medium text-ink">
                            {highlight(roundTitle, query)}
                          </div>
                          {descriptionMatch && (
                            <div className="text-sm text-ink-muted mt-0.5">
                              {highlight(descriptionMatch, query)}
                            </div>
                          )}
                          <div className="text-xs text-ink-subtle mt-0.5">
                            {leagueTitle}
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

function Thumbnail({ trackInfo }: { trackInfo: TrackInfo }) {
  return (
    <img
      src={trackInfo.albumImageUrl}
      alt=""
      width={40}
      height={40}
      className="w-10 h-10 shrink-0 rounded-media object-cover"
    />
  );
}
