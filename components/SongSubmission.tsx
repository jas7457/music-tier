"use client";

import { useState, useRef, useCallback } from "react";
import AlbumArt from "./AlbumArt";
import { PopulatedRound, PopulatedSubmission } from "@/lib/types";
import { getTrackDetails } from "@/lib/api";
import { extractTrackIdFromUrl, getTrackUrlFromId } from "@/lib/spotify";
import { useAuth } from "@/lib/AuthContext";
import { MultiLine } from "./MultiLine";
import Card from "./Card";
import { twMerge } from "tailwind-merge";
import { useData } from "@/lib/DataContext";
import { unknownToErrorString } from "@/lib/utils/unknownToErrorString";
import { useToast } from "@/lib/ToastContext";
import { HapticButton } from "./HapticButton";

interface SongSubmissionProps {
  round: PopulatedRound;
  className?: string;
}
export function SongSubmission({ round, className }: SongSubmissionProps) {
  const { user } = useAuth();
  const toast = useToast();
  const { refreshData } = useData();
  const [submission, _setSubmission] = useState(round.userSubmission ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackUrl, setTrackUrl] = useState(
    submission ? getTrackUrlFromId(submission.trackInfo.trackId) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [searchResults, setSearchResults] = useState<
    PopulatedSubmission["trackInfo"][]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedTrackIdRef = useRef<string | null>(null);

  const isRealSubmission = submission ? submission._id !== "" : false;

  const setSubmission = useCallback(
    (update: Partial<PopulatedSubmission>) => {
      _setSubmission((prev) => {
        if (prev) {
          return { ...prev, ...update };
        }
        return {
          _id: "",
          roundId: round._id,
          userId: user?._id || "",
          submissionDate: Date.now(),
          note: "",
          userObject: user || undefined,
          trackInfo: {
            trackId: "",
            title: "",
            artists: [],
            albumName: "",
            albumImageUrl: "",
          },
          ...update,
        };
      });
    },
    [round._id, user]
  );

  const fetchTrackPreview = async (trackId: string | null) => {
    if (!trackId) {
      setError("Invalid Spotify track URL");
      return;
    }

    if (
      trackId === submission?.trackInfo.trackId ||
      trackId === lastFetchedTrackIdRef.current
    ) {
      return;
    }
    lastFetchedTrackIdRef.current = trackId;

    setLoadingPreview(true);
    try {
      const trackData = await getTrackDetails(trackId);
      if (trackData.track) {
        setSubmission({ trackInfo: trackData.track });
        setError(null);
      } else {
        setError(`Track not found: ${trackData.error}`);
      }
    } catch (err) {
      const message = unknownToErrorString(err, "Error fetching track preview");
      toast.show({
        title: "Error fetching track preview",
        variant: "error",
        message,
      });
      setError(message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const debouncedFetchPreview = (trackId: string | null) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchTrackPreview(trackId);
    }, 1000);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) {
      setError("Please select a track to submit.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const method = isRealSubmission ? "PUT" : "POST";
      const response = await fetch(`/api/rounds/${round._id}/submissions`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackInfo: submission.trackInfo,
          note: submission.note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            `Failed to ${isRealSubmission ? "update" : "submit"} song`
        );
        setIsSubmitting(false);
        return;
      }

      setIsEditing(false);
      setIsSubmitting(false);
    } catch (err) {
      const message = unknownToErrorString(
        err,
        `Failed to ${isRealSubmission ? "update" : "submit"} song`
      );
      toast.show({
        title: `Failed to ${isRealSubmission ? "update" : "submit"} song`,
        variant: "error",
        message,
      });
      setError(message);
      setIsSubmitting(false);
    } finally {
      refreshData("manual");
    }
  };

  const isRoundEnded = round.votingEndDate <= Date.now();

  const fullClassName = twMerge("p-3", className);

  if (submission && isRealSubmission && !isEditing) {
    return (
      <Card
        variant="outlined"
        className={twMerge(
          fullClassName,
          "bg-primary-lightest border-primary-light"
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-semibold text-sm text-gray-700">
            Your Submission
          </h5>
          {!isRoundEnded && (
            <HapticButton
              onClick={() => setIsEditing(true)}
              className="text-xs text-primary-dark hover:text-primary-darkest font-medium"
            >
              Change
            </HapticButton>
          )}
        </div>
        <div className="flex items-center gap-3">
          {submission.trackInfo.albumImageUrl && (
            <AlbumArt submission={submission} size={64} round={round} />
          )}
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {submission.trackInfo.title}
            </p>
            <p className="text-xs text-gray-600">
              {submission.trackInfo.artists.join(", ")}
            </p>
            {submission.note && (
              <p className="text-xs text-gray-500 mt-1 italic">
                <MultiLine>{submission.note}</MultiLine>
              </p>
            )}
          </div>
        </div>
        {isRoundEnded && (
          <p className="text-xs text-gray-500 mt-3 italic">
            Round has ended - submissions are locked
          </p>
        )}
      </Card>
    );
  }

  if (isRoundEnded && !isRealSubmission) {
    return (
      <Card variant="outlined" className={fullClassName}>
        <p className="text-sm text-gray-500 italic">
          Round has ended - submissions are no longer accepted
        </p>
      </Card>
    );
  }

  return (
    <Card variant="outlined" className={fullClassName}>
      <h5 className="font-semibold text-sm mb-3 text-gray-700">
        {isRealSubmission ? "Update Your Submission" : "Submit Your Song"}
      </h5>

      {error && (
        <Card
          className={
            "bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-3"
          }
        >
          {error}
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <label
            htmlFor="trackUrl"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Search for a song or paste Spotify URL *
          </label>
          <input
            id="trackUrl"
            type="text"
            autoComplete="off"
            required
            value={trackUrl}
            onPaste={(e) => {
              const value = e.clipboardData.getData("text");
              const trackId = extractTrackIdFromUrl(value);
              if (trackId) {
                // It's a URL, fetch preview
                fetchTrackPreview(trackId);
                setShowSearchResults(false);
              } else {
                // It's not a URL, search for it
                debouncedSearch(value);
              }
            }}
            onChange={(e) => {
              const value = e.target.value;
              setTrackUrl(value);
              const trackId = extractTrackIdFromUrl(value);
              if (trackId) {
                // It's a URL, fetch preview
                debouncedFetchPreview(trackId);
                setShowSearchResults(false);
              } else {
                // It's not a URL, search for it
                debouncedSearch(value);
              }
            }}
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
            placeholder="Search: 'Bohemian Rhapsody' or paste: https://open.spotify.com/track/..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.trackId}
                  type="button"
                  onClick={() => {
                    setSubmission({ trackInfo: result });
                    setTrackUrl(getTrackUrlFromId(result.trackId));
                    setSearchResults([]);
                    setShowSearchResults(false);
                    setError(null);
                  }}
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

          {/* Search Loading */}
          {isSearching && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3">
              <p className="text-xs text-gray-500">Searching...</p>
            </div>
          )}
        </div>

        {/* Track Preview */}
        {loadingPreview && (
          <div className="p-3 bg-primary-lightest border border-primary rounded-md">
            <p className="text-xs text-gray-500">Loading track preview...</p>
          </div>
        )}

        {submission?.trackInfo && !loadingPreview && (
          <div className="p-3 bg-primary-lightest border border-primary rounded-md">
            <div className="flex items-center gap-3">
              {submission.trackInfo.albumImageUrl && (
                <AlbumArt submission={submission} size={56} round={round} />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {submission.trackInfo.title}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {submission.trackInfo.artists.join(", ")}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {submission.trackInfo.albumName}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="note"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Note (optional)
          </label>
          <textarea
            id="note"
            value={submission?.note || ""}
            onChange={(e) => setSubmission({ note: e.target.value })}
            placeholder="Why did you choose this song?"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2">
          <HapticButton
            type="submit"
            disabled={
              isSubmitting ||
              !submission ||
              !submission.trackInfo.trackId ||
              loadingPreview
            }
            className="flex-1 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? isRealSubmission
                ? "Updating..."
                : "Submitting..."
              : isRealSubmission
              ? "Update Song"
              : "Submit Song"}
          </HapticButton>
          {isEditing && (
            <HapticButton
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </HapticButton>
          )}
        </div>
      </form>
    </Card>
  );
}
