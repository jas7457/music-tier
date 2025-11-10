"use client";

import { useState, useMemo } from "react";
import AlbumArt from "./AlbumArt";
import Card from "./Card";
import { UsersList } from "./UsersList";
import { PopulatedSubmission, PopulatedUser, PopulatedVote } from "@/lib/types";

interface VotingRoundProps {
  round: {
    _id: string;
    submissions: PopulatedSubmission[];
    votes: PopulatedVote[];
  };
  league: {
    votesPerRound: number;
    users: Array<PopulatedUser>;
  };
  currentUser: PopulatedUser;
  onDataSaved: () => void;
  isVotingEnabled: boolean;
}

export default function VotingRound({
  round,
  league,
  currentUser,
  onDataSaved,
  isVotingEnabled,
}: VotingRoundProps) {
  const [votes, setVotes] = useState(() =>
    round.submissions.reduce((acc, submission) => {
      const currentVote = round.votes.find(
        (vote) =>
          vote.userId === currentUser._id &&
          vote.submissionId === submission._id
      );
      if (currentVote) {
        acc[submission._id] = {
          points: currentVote.points,
          note: currentVote.note || "",
        };
      } else {
        acc[submission._id] = { points: 0, note: "" };
      }
      return acc;
    }, {} as Record<string, { points: number; note: string }>)
  );
  const [saving, setSaving] = useState(false);

  // Calculate total votes used
  const totalVotesUsed = useMemo(() => {
    return Object.values(votes).reduce(
      (sum, vote) => sum + vote.points || 0,
      0
    );
  }, [votes]);
  const remainingVotes = league.votesPerRound - totalVotesUsed;

  const handleVoteChange = async (submissionId: string, change: number) => {
    const currentVotes = votes[submissionId]?.points || 0;
    const newVotes = Math.max(0, currentVotes + change);

    // Check if we can add more votes
    if (change > 0 && totalVotesUsed >= league.votesPerRound) {
      return;
    }

    // Update local state
    setVotes((prev) => ({
      ...prev,
      [submissionId]: {
        points: newVotes,
        note: prev[submissionId]?.note || "",
      },
    }));
  };

  const handleNoteChange = (submissionId: string, note: string) => {
    setVotes((prev) => {
      return {
        ...prev,
        [submissionId]: { ...prev[submissionId], note },
      };
    });
  };

  const handleSave = async () => {
    if (!isVotingEnabled) {
      return;
    }
    try {
      setSaving(true);
      // Save all votes in parallel
      const response = await fetch(`/api/rounds/${round._id}/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(votes),
      });

      if (!response.ok) {
        throw new Error(`Failed to save vote for ${round._id}`);
      }
      onDataSaved();
    } catch (error) {
      console.error("Error saving votes:", error);
      alert("Failed to save some votes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const { usersThatHaveVoted, usersThatHaveNotVoted } = useMemo(() => {
    const usersWithIndex = league.users.map((user, index) => ({
      ...user,
      index,
    }));
    const usersById = usersWithIndex.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {} as Record<string, PopulatedUser & { index: number }>);

    const usersThatHaveVoted = round.votes
      .map((vote) => usersById[vote.userId])
      .filter((user, index, array) => user && array.indexOf(user) === index);

    const usersThatHaveNotVoted = usersWithIndex.filter((user) => {
      return !usersThatHaveVoted.find(
        (votedUser) => votedUser._id === user._id
      );
    });

    return { usersThatHaveVoted, usersThatHaveNotVoted };
  }, [league, round]);

  return (
    <div className="mt-4 space-y-4">
      {/* Voting Summary */}
      <Card className="p-4 bg-blue-50 border-blue-200 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h6 className="font-semibold text-sm text-gray-700">
              {isVotingEnabled
                ? "Voting in Progress"
                : "Waiting on others to vote"}
            </h6>
            <p className="text-xs text-gray-600 mt-1">
              {isVotingEnabled ? (
                <>
                  Vote for your favorite tracks! You have{" "}
                  <span className="font-semibold">{league.votesPerRound}</span>{" "}
                  total votes to distribute.
                </>
              ) : (
                <>You have already submitted your votes.</>
              )}
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
                {submission.trackInfo.albumImageUrl && (
                  <AlbumArt
                    trackInfo={submission.trackInfo}
                    size={80}
                    usePlayerContext={true}
                  />
                )}

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-base truncate">
                    {submission.trackInfo.title}
                  </h5>
                  <p className="text-sm text-gray-600 truncate">
                    {submission.trackInfo.artists.join(", ")}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {submission.trackInfo.albumName}
                  </p>
                  {submission.note && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      &quot;{submission.note}&quot;
                    </p>
                  )}
                </div>

                {/* Voting Controls */}
                {!isYourSubmission && (
                  <div className="flex flex-col items-center min-w-[60px]">
                    {isVotingEnabled && (
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
                    )}

                    <div className="text-lg font-bold text-gray-700">
                      {savedSubmission?.points || 0}
                    </div>

                    {isVotingEnabled && (
                      <button
                        onClick={() => handleVoteChange(submission._id, -1)}
                        disabled={savedSubmission?.points === 0 || saving}
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
                    )}
                  </div>
                )}
              </div>

              {/* Note Input */}
              {!isYourSubmission && (
                <div className="pl-24">
                  {isVotingEnabled ? (
                    <textarea
                      value={votes[submission._id]?.note || ""}
                      onChange={(e) =>
                        handleNoteChange(submission._id, e.target.value)
                      }
                      placeholder="Add a note about why you voted for this track (optional)..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  ) : votes[submission._id]?.note ? (
                    <div className="text-xs text-gray-500">
                      Note: {votes[submission._id].note}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}

        {/* Save All Button */}
        {isVotingEnabled && (
          <div className="pt-3 border-t border-blue-200">
            <button
              onClick={handleSave}
              disabled={saving || remainingVotes !== 0}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Votes"}
            </button>
          </div>
        )}

        {usersThatHaveVoted.length > 0 && (
          <UsersList
            users={usersThatHaveVoted}
            text={{ noun: "votes", verb: "voted" }}
          />
        )}

        {usersThatHaveNotVoted.length > 0 && (
          <UsersList
            users={usersThatHaveNotVoted}
            text={{ noun: "votes", verb: "not voted" }}
          />
        )}
      </Card>
    </div>
  );
}
