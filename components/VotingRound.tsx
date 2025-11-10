"use client";

import { useState, useEffect, useMemo } from "react";
import { SpotifyTrack } from "@/lib/spotify";
import type {
  SongSubmission as SongSubmissionType,
  User,
  Vote,
} from "../databaseTypes";
import AlbumArt from "./AlbumArt";
import Card from "./Card";

interface VotingRoundProps {
  round: {
    _id: string;
    submissions: (SongSubmissionType & { trackInfo: SpotifyTrack })[];
    votes: Vote[];
  };
  league: {
    votesPerRound: number;
    users: Array<User>;
  };
  currentUser: User;
}

export default function VotingRound({
  round,
  league,
  currentUser,
}: VotingRoundProps) {
  const [votes, setVotes] = useState(() => {
    return round.votes.reduce((acc, vote) => {
      acc[vote.submissionId] = { votes: vote.points, note: vote.note || "" };
      return acc;
    }, {} as Record<string, { votes: number; note: string }>);
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calculate total votes used
  const totalVotesUsed = useMemo(() => {
    return Object.values(votes).reduce((sum, vote) => sum + vote.votes, 0);
  }, [votes]);
  const remainingVotes = league.votesPerRound - totalVotesUsed;

  const saveVote = async (
    submissionId: string,
    points: number,
    note?: string
  ) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/rounds/${round._id}/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId,
          points,
          note: note || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save vote");
      }
    } catch (error) {
      console.error("Error saving vote:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleVoteChange = async (submissionId: string, change: number) => {
    const currentVotes = votes[submissionId]?.votes || 0;
    const newVotes = Math.max(0, currentVotes + change);

    // Check if we can add more votes
    if (change > 0 && totalVotesUsed >= league.votesPerRound) {
      return;
    }

    // Update local state
    setVotes((prev) => ({
      ...prev,
      [submissionId]: { votes: newVotes, note: prev[submissionId]?.note || "" },
    }));
  };

  const handleNoteChange = (submissionId: string, note: string) => {
    setVotes((prev) => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], note },
    }));
  };

  const handleSave = async (submissionId: string) => {
    const submission = votes[submissionId];
    if (!submission) {
      return;
    }

    try {
      await saveVote(submissionId, submission.votes, submission.note);
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-gray-600 text-sm">Loading submissions...</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Voting Summary */}
      <Card className="p-4 bg-blue-50 border-blue-200 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h6 className="font-semibold text-sm text-gray-700">
              Voting in Progress
            </h6>
            <p className="text-xs text-gray-600 mt-1">
              Vote for your favorite tracks! You have{" "}
              <span className="font-semibold">{league.votesPerRound}</span>{" "}
              total votes to distribute.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {remainingVotes}
            </div>
            <div className="text-xs text-gray-600">votes left</div>
          </div>
        </div>

        {/* Submissions */}
        {round.submissions.map((submission) => {
          const savedSubmission = votes[submission._id];
          const canVoteUp = totalVotesUsed < league.votesPerRound;
          const isYourSubmission = submission.userId === currentUser._id;

          return (
            <div key={submission._id} className="space-y-2">
              <div className="flex items-center gap-4">
                {/* Album Art */}
                {submission.trackInfo.album.images[0] && (
                  <AlbumArt
                    imageUrl={submission.trackInfo.album.images[0].url}
                    trackName={submission.trackInfo.name}
                    trackId={submission.trackId}
                    trackUri={`spotify:track:${submission.trackId}`}
                    size={80}
                    usePlayerContext={true}
                  />
                )}

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-base truncate">
                    {submission.trackInfo.name}
                  </h5>
                  <p className="text-sm text-gray-600 truncate">
                    {submission.trackInfo.artists.map((a) => a.name).join(", ")}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {submission.trackInfo.album.name}
                  </p>
                  {submission.note && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      "{submission.note}"
                    </p>
                  )}
                </div>

                {/* Voting Controls */}
                {!isYourSubmission && (
                  <div className="flex flex-col items-center min-w-[60px]">
                    <button
                      onClick={() => handleVoteChange(submission._id, 1)}
                      disabled={!canVoteUp || saving}
                      className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      title={canVoteUp ? "Vote up" : "No votes remaining"}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>

                    <div className="text-lg font-bold text-gray-700">
                      {savedSubmission?.votes || 0}
                    </div>

                    <button
                      onClick={() => handleVoteChange(submission._id, -1)}
                      disabled={savedSubmission?.votes === 0 || saving}
                      className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      title="Vote down"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Note Input */}
              {!isYourSubmission && (
                <div className="pl-24">
                  <textarea
                    value={votes[submission._id]?.note || ""}
                    onChange={(e) =>
                      handleNoteChange(submission._id, e.target.value)
                    }
                    placeholder="Add a note about why you voted for this track (optional)..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
