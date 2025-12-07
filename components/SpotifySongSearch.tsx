"use client";

import { useState, useRef, useEffect } from "react";
import { extractTrackIdFromUrl } from "@/lib/spotify";
import { unknownToErrorString } from "@/lib/utils/unknownToErrorString";
import { useToast } from "@/lib/ToastContext";
import { getTrackDetails } from "@/lib/api";
import { TrackInfo } from "@/databaseTypes";

interface SpotifySongSearchProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onTrackFetched: (trackInfo: TrackInfo, trackUrl: string) => void;
  onSongSelected: (trackInfo: TrackInfo, trackUrl: string) => void;
  disabled?: boolean;
  currentTrackId?: string;
}

export function SpotifySongSearch({
  value,
  onChange,
  onTrackFetched,
  onSongSelected,
  disabled = false,
  currentTrackId,
  placeholder = "Search: 'Bohemian Rhapsody' or paste: https://open.spotify.com/track/...",
}: SpotifySongSearchProps) {
  const toast = useToast();
  const [searchResults, setSearchResults] = useState<TrackInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const trackIdDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedTrackIdRef = useRef<string | null>(null);

  const searchTracks = async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search tracks");
      }

      const data = await response.json();
      setSearchResults(data.tracks || []);
      setShowSearchResults(true);
    } catch (err) {
      const message = unknownToErrorString(err, "Error searching tracks");
      toast.show({
        title: "Error searching tracks",
        variant: "error",
        message,
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = (query: string) => {
    // Clear existing timer
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    // Set new timer
    searchDebounceTimerRef.current = setTimeout(() => {
      searchTracks(query);
    }, 500);
  };

  const fetchTrackPreview = async (trackId: string | null) => {
    if (!trackId) {
      toast.show({
        title: "Invalid Spotify track URL",
        variant: "error",
        message: "Please provide a valid Spotify track URL",
      });
      return;
    }

    if (
      trackId === currentTrackId ||
      trackId === lastFetchedTrackIdRef.current
    ) {
      return;
    }
    lastFetchedTrackIdRef.current = trackId;

    setLoadingPreview(true);
    try {
      const trackData = await getTrackDetails(trackId);
      if (trackData.track) {
        const trackUrl = `https://open.spotify.com/track/${trackId}`;
        onTrackFetched(trackData.track, trackUrl);
      } else {
        toast.show({
          title: "Track not found",
          variant: "error",
          message: trackData.error || "Could not find track",
        });
      }
    } catch (err) {
      const message = unknownToErrorString(err, "Error fetching track preview");
      toast.show({
        title: "Error fetching track preview",
        variant: "error",
        message,
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const debouncedFetchPreview = (trackId: string) => {
    // Clear existing timer
    if (trackIdDebounceTimerRef.current) {
      clearTimeout(trackIdDebounceTimerRef.current);
    }

    // Set new timer
    trackIdDebounceTimerRef.current = setTimeout(() => {
      fetchTrackPreview(trackId);
    }, 1000);
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    const trackId = extractTrackIdFromUrl(inputValue);
    if (trackId) {
      // It's a URL, fetch preview
      debouncedFetchPreview(trackId);
      setShowSearchResults(false);
    } else {
      // It's not a URL, search for it
      debouncedSearch(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedValue = e.clipboardData.getData("text");
    const trackId = extractTrackIdFromUrl(pastedValue);
    if (trackId) {
      // It's a URL, fetch preview immediately (no debounce on paste)
      fetchTrackPreview(trackId);
      setShowSearchResults(false);
    } else {
      // It's not a URL, search for it
      debouncedSearch(pastedValue);
    }
  };

  const handleSongSelect = (result: TrackInfo) => {
    const trackUrl = `https://open.spotify.com/track/${result.trackId}`;
    onSongSelected(result, trackUrl);
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
      if (trackIdDebounceTimerRef.current) {
        clearTimeout(trackIdDebounceTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <input
        type="text"
        autoComplete="off"
        disabled={disabled || loadingPreview}
        value={value}
        onPaste={handlePaste}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={() => {
          // Delay hiding results to allow clicking on them
          setTimeout(() => {
            setShowSearchResults(false);
          }, 200);
        }}
        onFocus={() => {
          if (searchResults.length > 0) {
            setShowSearchResults(true);
          }
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
      />

      {/* Search Results Dropdown */}
      {showSearchResults && searchResults.length > 0 && !loadingPreview && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto">
          {searchResults.map((result) => (
            <button
              key={result.trackId}
              type="button"
              onClick={() => handleSongSelect(result)}
              className="w-full p-3 hover:bg-primary-lightest transition-colors text-left border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                {result.albumImageUrl && (
                  <img
                    src={result.albumImageUrl}
                    alt={result.albumName}
                    className="w-12 h-12 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {result.title}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {result.artists.join(", ")}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {result.albumName}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Track Loading */}
      {loadingPreview && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3">
          <p className="text-xs text-gray-500">Loading track preview...</p>
        </div>
      )}

      {/* Search Loading */}
      {isSearching && !loadingPreview && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3">
          <p className="text-xs text-gray-500">Searching...</p>
        </div>
      )}
    </>
  );
}
