"use client";

import { useState, useMemo, useEffect } from "react";
import AlbumArt from "./AlbumArt";
import Card from "./Card";
import { UsersList } from "./UsersList";
import { PopulatedRound, PopulatedUser } from "@/lib/types";
import { UserGuess } from "./UserGuess";
import { BlockQuote } from "./BlockQuote";
import { twMerge } from "tailwind-merge";
import { getStatusColor } from "@/lib/utils/colors";
import { useData } from "@/lib/DataContext";
import { useToast } from "@/lib/ToastContext";
import { unknownToErrorString } from "@/lib/utils/unknownToErrorString";
import { Avatar } from "./Avatar";
import { formatDateWithTime } from "@/lib/utils/formatDate";
import { HapticButton } from "./HapticButton";

const LOCAL_STORAGE_KEY = "VotingRound.votes";

interface VotingRoundProps {
  round: PopulatedRound;
  league: {
    _id: string;
    votesPerRound: number;
    users: Array<PopulatedUser>;
  };
  currentUser: PopulatedUser;
}

type VoteRecord = Record<
  string,
  { points: number; note: string; userGuessId?: string }
>;

export default function VotingRound({
  round,
  league,
  currentUser,
}: VotingRoundProps) {
  const toast = useToast();
  const { refreshData } = useData();
  const [stage, setStage] = useState<"voting" | "guessing" | "submitted">(
    round.stage === "voting" ? "voting" : "submitted"
  );
  const [votes, setVotes] = useState(() => {
    const storedVersion: Partial<VoteRecord> = (() => {
      try {
        const storedVersion = JSON.parse(
          localStorage.getItem(LOCAL_STORAGE_KEY) || "{}"
        );
        if (
          storedVersion.roundId !== round._id ||
          storedVersion.leagueId !== league._id ||
          storedVersion.userId !== currentUser._id
        ) {
          return {};
        }
        return storedVersion.votes;
      } catch {
        return {};
      }
    })();

    return round.submissions.reduce((acc, submission) => {
      const currentVote = round.votes.find(
        (vote) =>
          vote.userId === currentUser._id &&
          vote.submissionId === submission._id
      );

      const points = (() => {
        if (round.stage === "currentUserVotingCompleted") {
          return round.votes.reduce((sum, vote) => {
            return (
              sum + (vote.submissionId === submission._id ? vote.points : 0)
            );
          }, 0);
        }
        return currentVote?.points ?? 0;
      })();

      if (currentVote) {
        acc[submission._id] = {
          points,
          note: currentVote.note || "",
          userGuessId: currentVote.userGuessId,
        };
      } else {
        acc[submission._id] = {
          points: 0,
          note: "",
          userGuessId: undefined,
          ...(storedVersion[submission._id] ?? {}),
        };
      }
      return acc;
    }, {} as VoteRecord);
  });

  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        roundId: round._id,
        leagueId: league._id,
        userId: currentUser._id,
        votes,
      })
    );
  }, [votes, round._id, league._id, currentUser._id]);
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
        userGuessId: prev[submissionId]?.userGuessId,
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

  const handleGuessChange = (
    submissionId: string,
    userId: string | undefined
  ) => {
    setVotes((prev) => {
      return {
        ...prev,
        [submissionId]: { ...prev[submissionId], userGuessId: userId },
      };
    });
  };

  const handleSave = async () => {
    if (round.stage !== "voting") {
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
        throw new Error(`Failed to submit vote for ${round._id}`);
      }
    } catch (error) {
      const message = unknownToErrorString(error, "Failed to save some votes");
      toast.show({
        title: "Failed to save some votes",
        variant: "error",
        message,
      });
    } finally {
      setSaving(false);
      setStage("submitted");
      refreshData("manual");
    }
  };

  const { usersThatHaveVoted, usersThatHaveNotVoted } = useMemo(() => {
    return league.users.reduce(
      (acc, user) => {
        const userVotes = round.votes.reduce((acc, vote) => {
          if (vote.userId === user._id) {
            return acc + vote.points;
          }
          return acc;
        }, 0);
        const hasVoted = userVotes >= league.votesPerRound;
        if (hasVoted) {
          acc.usersThatHaveVoted.push(user);
          acc.usersThatHaveVoted.sort((userA, userB) => {
            const voteA = round.votes.find((vote) => vote.userId === userA._id);
            const voteB = round.votes.find((vote) => vote.userId === userB._id);
            if (!voteA || !voteB) {
              return 0;
            }
            return voteA.voteDate - voteB.voteDate;
          });
        } else {
          acc.usersThatHaveNotVoted.push(user);
        }
        return acc;
      },
      {
        usersThatHaveVoted: [] as PopulatedUser[],
        usersThatHaveNotVoted: [] as PopulatedUser[],
      }
    );
  }, [league, round]);

  const { title, subtitle } = (() => {
    switch (round.stage) {
      case "voting":
        return {
          title: "Voting in Progress",
          subtitle: (
            <>
              Vote for your favorite tracks! You have{" "}
              <span className="font-semibold">{league.votesPerRound}</span>{" "}
              total votes to distribute.
            </>
          ),
        };
      case "currentUserVotingCompleted":
        return {
          title: "Waiting on others to vote",
          subtitle: "You have already submitted your votes.",
        };
      case "completed": {
        return {
          title: "Round Completed",
          subtitle: "View the results of the round below.",
        };
      }
      default:
        return {
          title: "Unexpected state",
          subtitle: "Tell Jason you saw this",
        };
    }
  })();

  return (
    <div className="space-y-4">
      {/* Voting Summary */}
      <Card
        className={twMerge(
          "py-2 md:py-4 flex flex-col gap-3",
          getStatusColor(round.stage),
          "text-black"
        )}
        variant="outlined"
      >
        <div className="px-2 md:px-4 flex items-center justify-between">
          <div>
            <h6 className="font-semibold text-sm text-gray-700">{title}</h6>
            <p className="text-xs text-gray-600">{subtitle}</p>
          </div>

          {round.stage === "voting" && (
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-600">
                {remainingVotes}
              </div>
              <div className="text-xs text-gray-600">votes left</div>
            </div>
          )}
        </div>

        {/* Submissions */}
        {round.submissions.map((submission) => {
          const savedSubmission = votes[submission._id];
          const canVoteUp = totalVotesUsed < league.votesPerRound;
          const isYourSubmission = submission.userId === currentUser._id;

          return (
            <div
              key={submission._id}
              className="px-2 md:px-4 space-y-2 border-b pb-1 border-gray-300"
            >
              <div className="flex items-center gap-4">
                {/* Album Art */}
                {submission.trackInfo.albumImageUrl && (
                  <AlbumArt
                    trackInfo={submission.trackInfo}
                    size={80}
                    round={round}
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
                    <p className="text-xs text-gray-600 mt-1 italic">
                      {submission.note}
                    </p>
                  )}

                  {round.stage === "completed" && submission.userObject && (
                    <div className="flex items-center gap-1">
                      <Avatar user={submission.userObject} size={6} />
                      <p className="text-sm text-gray-600">
                        Submitted by {`${submission.userObject.userName}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Voting Controls */}
                {(!isYourSubmission ||
                  round.stage === "currentUserVotingCompleted") && (
                  <div
                    className={twMerge(
                      "flex items-center gap-1",
                      round.stage === "currentUserVotingCompleted"
                        ? "self-start"
                        : ""
                    )}
                  >
                    <div className="flex flex-col items-center min-w-10">
                      {stage === "voting" && (
                        <HapticButton
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
                        </HapticButton>
                      )}

                      <div className="text-lg font-bold text-gray-700">
                        {savedSubmission?.points || 0}
                      </div>

                      {stage === "voting" && (
                        <HapticButton
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
                        </HapticButton>
                      )}
                    </div>
                    {/* User Guess */}
                    <div>
                      <UserGuess
                        isCorrect={
                          round.stage === "completed" &&
                          savedSubmission.userGuessId
                            ? savedSubmission.userGuessId === submission.userId
                            : undefined
                        }
                        stage={stage}
                        users={league.users.filter((u) => {
                          if (u._id === currentUser._id) {
                            return false;
                          }
                          return !Object.values(votes).some(
                            (vote) => vote.userGuessId === u._id
                          );
                        })}
                        selectedUser={
                          savedSubmission?.userGuessId
                            ? league.users.find(
                                (u) => u._id === savedSubmission.userGuessId
                              )
                            : undefined
                        }
                        onSelectUser={(user) =>
                          handleGuessChange(submission._id, user?._id)
                        }
                        disabled={saving}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Note Input */}
              {!isYourSubmission && (
                <div className="pl-24">
                  {round.stage === "voting" ? (
                    <textarea
                      className="w-full px-3 py-2 text-xs border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                      value={votes[submission._id]?.note || ""}
                      onChange={(e) =>
                        handleNoteChange(submission._id, e.target.value)
                      }
                      placeholder="Add a note about why you voted for this track (optional)..."
                      rows={2}
                    />
                  ) : votes[submission._id]?.note ? (
                    <BlockQuote className="text-xs text-gray-500">
                      {votes[submission._id].note}
                    </BlockQuote>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}

        {stage === "voting" && (
          <div className="px-2 md:px-4 pt-3">
            <HapticButton
              onClick={() => setStage("guessing")}
              disabled={remainingVotes !== 0}
              className="w-full px-2 md:px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Continue to Guesses
            </HapticButton>
          </div>
        )}

        {stage === "guessing" && (
          <div className="px-2 md:px-4 pt-3">
            <HapticButton
              onClick={handleSave}
              disabled={saving || remainingVotes !== 0}
              className="w-full px-2 md:px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? "Submitting..." : "Submit Votes"}
            </HapticButton>
          </div>
        )}

        {usersThatHaveVoted.length > 0 && (
          <UsersList
            className="px-2 md:px-4"
            users={usersThatHaveVoted}
            text={{ noun: "votes", verb: "voted" }}
            tooltipText={(user) => {
              const vote = round.votes.find((vote) => vote.userId === user._id);
              if (!vote) {
                return `${user.userName}`;
              }
              return `${user.userName} voted on ${formatDateWithTime(
                vote.voteDate
              )}`;
            }}
          />
        )}

        {usersThatHaveNotVoted.length > 0 && (
          <UsersList
            className="px-2 md:px-4"
            users={usersThatHaveNotVoted}
            text={{ noun: "votes", verb: "not voted" }}
          />
        )}
      </Card>
    </div>
  );
}
