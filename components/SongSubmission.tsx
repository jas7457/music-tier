"use client";

import { useState, useEffect } from "react";
import { SpotifyTrack } from "@/lib/spotify";
import AlbumArt from "./AlbumArt";

interface SongSubmissionProps {
  roundId: string;
  roundEndDate: number | null;
}

interface Submission {
  _id: string;
  roundId: string;
  userId: string;
  trackId: string;
  note?: string;
}

export default function SongSubmission({
  roundId,
  roundEndDate,
}: SongSubmissionProps) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [trackDetails, setTrackDetails] = useState<SpotifyTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackUrl, setTrackUrl] = useState("");
  const [note, setNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, [roundId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rounds/${roundId}/submissions/user`);
      const data = await response.json();

      if (data.submission) {
        setSubmission(data.submission);
        // Fetch track details
        const trackResponse = await fetch(
          `/api/spotify/track/${data.submission.trackId}`
        );
        const trackData = await trackResponse.json();
        if (trackData.track) {
          setTrackDetails(trackData.track);
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
    } catch (err) {
      console.error("Error submitting song:", err);
      setError(`Failed to ${submission ? "update" : "submit"} song`);
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (submission && trackDetails) {
      // Pre-fill form with current submission
      setTrackUrl(`https://open.spotify.com/track/${submission.trackId}`);
      setNote(submission.note || "");
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setTrackUrl("");
    setNote("");
    setIsEditing(false);
    setError(null);
  };

  const isRoundEnded = roundEndDate ? roundEndDate <= Date.now() : false;

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
        <p className="text-gray-600 text-sm">Loading submission...</p>
      </div>
    );
  }

  if (submission && trackDetails && !isEditing) {
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
          {trackDetails.album.images[0] && (
            <AlbumArt
              imageUrl={trackDetails.album.images[0].url}
              trackName={trackDetails.name}
              trackId={submission.trackId}
              trackUri={`spotify:track:${submission.trackId}`}
              size={64}
              usePlayerContext={true}
            />
          )}
          <div className="flex-1">
            <p className="font-semibold text-sm">{trackDetails.name}</p>
            <p className="text-xs text-gray-600">
              {trackDetails.artists.map((a) => a.name).join(", ")}
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
            onChange={(e) => setTrackUrl(e.target.value)}
            placeholder="https://open.spotify.com/track/..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

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
}
