"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import AlbumArt from "./AlbumArt";
import { PopulatedSubmission, PopulatedTrackInfo } from "@/lib/types";
import { getTrackDetails } from "@/lib/api";

interface SongSubmissionProps {
  roundId: string;
  roundEndDate: number | null;
  userSubmission: PopulatedSubmission | undefined;
  onDataSaved: () => void;
}
export interface SongSubmissionRef {
  openSubmissionWithTrack: (trackUrl: string) => void;
}

export const SongSubmission = forwardRef<
  SongSubmissionRef,
  SongSubmissionProps
>(({ roundId, roundEndDate, userSubmission, onDataSaved }, ref) => {
  const [submission, setSubmission] = useState(userSubmission ?? null);
  const [trackInfo, setTrackInfo] = useState<PopulatedTrackInfo | null>(
    submission?.trackInfo ?? null
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackUrl, setTrackUrl] = useState("");
  const [note, setNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<PopulatedTrackInfo | null>(
    null
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Expose method to parent component
  useImperativeHandle(ref, () => ({
    openSubmissionWithTrack: (url: string) => {
      setTrackUrl(url);
      setIsEditing(true);
      // Trigger preview fetch
      fetchTrackPreview(url);
    },
  }));

  const extractTrackIdFromUrl = (url: string): string | null => {
    const patterns = [
      /spotify:track:([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const fetchTrackPreview = async (url: string) => {
    const trackId = extractTrackIdFromUrl(url);
    if (!trackId) {
      setPreviewTrack(null);
      return;
    }

    setLoadingPreview(true);
    try {
      const trackData = await getTrackDetails(trackId);
      if (trackData.track) {
        setPreviewTrack(trackData.track);
      } else {
        setPreviewTrack(null);
      }
    } catch (err) {
      console.error("Error fetching track preview:", err);
      setPreviewTrack(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const debouncedFetchPreview = (url: string) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchTrackPreview(url);
    }, 1000);
  };

  const handleTrackUrlChange = (value: string) => {
    setTrackUrl(value);
    debouncedFetchPreview(value);
  };

  const handleTrackUrlBlur = () => {
    // Clear debounce timer and fetch immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    fetchTrackPreview(trackUrl);
  };

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rounds/${roundId}/submissions/user`);
      const data = await response.json();

      if (data.submission) {
        setSubmission(data.submission);
        // Fetch track details
        const trackData = await getTrackDetails(data.submission.trackId);
        if (trackData.track) {
          setTrackInfo(trackData.track);
        } else {
          setTrackInfo(null);
        }
      }
    } catch (err) {
      console.error("Error fetching submission:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const method = submission ? "PUT" : "POST";
      const response = await fetch(`/api/rounds/${roundId}/submissions`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackUrl,
          note: note || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || `Failed to ${submission ? "update" : "submit"} song`
        );
        setSubmitting(false);
        return;
      }

      // Refresh submission data
      await fetchSubmission();
      setTrackUrl("");
      setNote("");
      setIsEditing(false);
      setSubmitting(false);
      onDataSaved();
    } catch (err) {
      console.error("Error submitting song:", err);
      setError(`Failed to ${submission ? "update" : "submit"} song`);
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (submission && trackInfo) {
      // Pre-fill form with current submission
      const url = `https://open.spotify.com/track/${submission.trackInfo.trackId}`;
      setTrackUrl(url);
      setNote(submission.note || "");
      setIsEditing(true);
      // Load the track preview immediately
      setPreviewTrack(trackInfo);
    }
  };

  const handleCancelEdit = () => {
    setTrackUrl("");
    setNote("");
    setIsEditing(false);
    setError(null);
    setPreviewTrack(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  const isRoundEnded = roundEndDate ? roundEndDate <= Date.now() : false;

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
        <p className="text-gray-600 text-sm">Loading submission...</p>
      </div>
    );
  }

  if (submission && trackInfo && !isEditing) {
    return (
      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-semibold text-sm text-gray-700">
            Your Submission
          </h5>
          {!isRoundEnded && (
            <button
              onClick={handleEdit}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Change
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {trackInfo.albumImageUrl && (
            <AlbumArt trackInfo={trackInfo} size={64} usePlayerContext={true} />
          )}
          <div className="flex-1">
            <p className="font-semibold text-sm">{trackInfo.title}</p>
            <p className="text-xs text-gray-600">
              {trackInfo.artists.join(", ")}
            </p>
            {submission.note && (
              <p className="text-xs text-gray-500 mt-1 italic">
                {submission.note}
              </p>
            )}
          </div>
        </div>
        {isRoundEnded && (
          <p className="text-xs text-gray-500 mt-3 italic">
            Round has ended - submissions are locked
          </p>
        )}
      </div>
    );
  }

  if (isRoundEnded && !submission) {
    return (
      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-500 italic">
          Round has ended - submissions are no longer accepted
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
      <h5 className="font-semibold text-sm mb-3 text-gray-700">
        {submission ? "Update Your Submission" : "Submit Your Song"}
      </h5>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-3">
          {error}
        </div>
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
            required
            value={trackUrl}
            onChange={(e) => handleTrackUrlChange(e.target.value)}
            onBlur={handleTrackUrlBlur}
            placeholder="https://open.spotify.com/track/..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Track Preview */}
        {loadingPreview && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-xs text-gray-500">Loading track preview...</p>
          </div>
        )}

        {previewTrack && !loadingPreview && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex items-center gap-3">
              {previewTrack.albumImageUrl && (
                <AlbumArt
                  trackInfo={previewTrack}
                  size={56}
                  usePlayerContext={true}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {previewTrack.title}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {previewTrack.artists.join(", ")}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {previewTrack.albumName}
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
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why did you choose this song?"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting
              ? submission
                ? "Updating..."
                : "Submitting..."
              : submission
              ? "Update Song"
              : "Submit Song"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
});

SongSubmission.displayName = "SongSubmission";
