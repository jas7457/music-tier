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
import { getStatusColor } from "@/lib/utils/colors";
import { useData } from "@/lib/DataContext";

interface SongSubmissionProps {
  round: PopulatedRound;
  className?: string;
}
export function SongSubmission({ round, className }: SongSubmissionProps) {
  const { user } = useAuth();
  const { refreshData } = useData();
  const [submission, _setSubmission] = useState(round.userSubmission ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackUrl, setTrackUrl] = useState(
    submission ? getTrackUrlFromId(submission.trackInfo.trackId) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
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
    [round._id, user?._id]
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
      setError(`Error fetching track preview: ${err}`);
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

  const handleTrackUrlBlur = () => {
    // Clear debounce timer and fetch immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    fetchTrackPreview(extractTrackIdFromUrl(trackUrl));
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
      console.error("Error submitting song:", err);
      setError(`Failed to ${isRealSubmission ? "update" : "submit"} song`);
      setIsSubmitting(false);
    } finally {
      refreshData("manual");
    }
  };

  const isRoundEnded = round.votingEndDate <= Date.now();

  const fullClassName = twMerge(
    "p-3",
    className,
    getStatusColor(round.stage),
    "text-black"
  );

  if (submission && isRealSubmission && !isEditing) {
    return (
      <Card variant="outlined" className={fullClassName}>
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-semibold text-sm text-gray-700">
            Your Submission
          </h5>
          {!isRoundEnded && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              Change
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {submission.trackInfo.albumImageUrl && (
            <AlbumArt
              trackInfo={submission.trackInfo}
              size={64}
              round={round}
            />
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
        <div>
          <label
            htmlFor="trackUrl"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Spotify Track URL *
          </label>
          <input
            id="trackUrl"
            type="text"
            autoComplete="off"
            required
            value={trackUrl}
            onPaste={(e) => {
              const value = e.clipboardData.getData("text");
              fetchTrackPreview(extractTrackIdFromUrl(value));
            }}
            onChange={(e) => {
              const value = e.target.value;
              setTrackUrl(value);
              debouncedFetchPreview(extractTrackIdFromUrl(value));
            }}
            onBlur={handleTrackUrlBlur}
            placeholder="https://open.spotify.com/track/..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Track Preview */}
        {loadingPreview && (
          <div className="p-3 bg-purple-50 border border-purple-400 rounded-md">
            <p className="text-xs text-gray-500">Loading track preview...</p>
          </div>
        )}

        {submission?.trackInfo && !loadingPreview && (
          <div className="p-3 bg-purple-50 border border-purple-400 rounded-md">
            <div className="flex items-center gap-3">
              {submission.trackInfo.albumImageUrl && (
                <AlbumArt
                  trackInfo={submission.trackInfo}
                  size={56}
                  round={round}
                />
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
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !submission ||
              !submission.trackInfo.trackId ||
              loadingPreview
            }
            className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? isRealSubmission
                ? "Updating..."
                : "Submitting..."
              : isRealSubmission
              ? "Update Song"
              : "Submit Song"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
