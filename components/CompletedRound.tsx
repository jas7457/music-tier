"use client";

import { useMemo } from "react";
import AlbumArt from "./AlbumArt";
import Card from "./Card";
import { PopulatedRound, PopulatedUser } from "@/lib/types";
import { Avatar } from "./Avatar";
import { MultiLine } from "./MultiLine";
import { useAuth } from "@/lib/AuthContext";

interface CompletedRoundProps {
  round: PopulatedRound;
  users: PopulatedUser[];
}

export default function CompletedRound({ round, users }: CompletedRoundProps) {
  const { user } = useAuth();
  const usersById = useMemo(() => {
    return users.reduce((acc, user, index) => {
      acc[user._id] = { ...user, index };
      return acc;
    }, {} as Record<string, PopulatedUser>);
  }, [users]);

  // Calculate total points for each submission and get voters
  const submissionsWithScores = useMemo(() => {
    const results = round.submissions.map((submission) => {
      const submissionVotes = round.votes.filter(
        (vote) => vote.submissionId === submission._id
      );
      const totalPoints = submissionVotes.reduce(
        (sum, vote) => sum + vote.points,
        0
      );
      const voters = submissionVotes
        .map((vote) => ({
          user: usersById[vote.userId],
          points: vote.points,
          note: vote.note,
        }))
        .filter((voter) => voter.user && voter.user._id !== submission.userId)
        .sort((a, b) => b.points - a.points);

      return {
        submission,
        totalPoints,
        voters,
      };
    });

    // Sort by total points descending
    return results.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [round.submissions, round.votes, usersById]);

  const submissionMarkup = useMemo(() => {
    let currentHighScore = -1;
    let currentPlace = 0;

    return submissionsWithScores.map(({ submission, totalPoints, voters }) => {
      const { position, emoji, cardClassName, innerClassName } = (() => {
        if (totalPoints > currentHighScore) {
          currentPlace += 1;
          currentHighScore = totalPoints;
        }

        const isGold = currentPlace === 1;
        const isSilver = currentPlace === 2;
        const isBronze = currentPlace === 3;

        if (isGold) {
          return {
            position: "1st",
            emoji: "🏆",
            cardClassName: "border-2 border-yellow-400 bg-yellow-50",
            innerClassName: "border-yellow-400",
          };
        } else if (isSilver) {
          return {
            position: "2nd",
            emoji: "🥈",
            cardClassName: "border-2 border-gray-400 bg-gray-50",
            innerClassName: "border-gray-400",
          };
        } else if (isBronze) {
          return {
            position: "3rd",
            emoji: "🥉",
            cardClassName: "border-2 border-[#cd7f32] bg-[#f9f2ec]",
            innerClassName: "border-[#cd7f32]",
          };
        } else {
          return {
            position: "",
            emoji: "",
            cardClassName: "",
            innerClassName: "",
          };
        }
      })();

      const submitter = usersById[submission.userId];
      const yourVote = round.votes.find(
        (vote) => vote.userGuessId === user?._id
      );

      return (
        <Card key={submission._id} className={cardClassName}>
          {/* Submission Header */}
          <div className="flex gap-4 p-6">
            <div className="flex grow gap-4 items-center">
              {/* Album Art */}
              <AlbumArt
                trackInfo={submission.trackInfo}
                size={120}
                round={round}
              />

              {/* Track Info */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <h5 className="font-semibold text-xl">
                  {submission.trackInfo.title}
                </h5>
                <div>
                  <p className="text-base text-gray-700">
                    {submission.trackInfo.artists.join(", ")}
                  </p>
                  <p className="text-sm text-gray-600">
                    {submission.trackInfo.albumName}
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  Submitted by {usersById[submission.userId].userName}
                </p>

                {submission.note && (
                  <p className="text-sm text-gray-700 italic">
                    &quot;<MultiLine>{submission.note}</MultiLine>&quot;
                  </p>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="flex flex-col gap-2 items-end">
              <div className="text-right">
                <div className="text-4xl font-bold text-yellow-600">
                  {totalPoints}
                </div>
                <div className="text-sm text-gray-600">
                  {voters.length} {voters.length === 1 ? "voter" : "voters"}
                </div>
              </div>

              {yourVote?.userGuessObject && (
                <Avatar
                  user={yourVote.userGuessObject}
                  size={6}
                  tooltipText={`Your guess: ${yourVote.userGuessObject.firstName} ${yourVote.userGuessObject.lastName}`}
                  includeTooltip
                />
              )}
            </div>
          </div>

          {/* Winner Badge */}
          {submitter && position && (
            <div
              className={`ml-4 mr-4 p-4 bg-white rounded-lg border-2 ${innerClassName}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-yellow-600">
                    {position}
                  </span>
                  <span className="text-3xl">{emoji}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar user={submitter} size={10} />
                  <span className="font-semibold text-lg text-gray-800">
                    {submitter.firstName} {submitter.lastName}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Voters List */}
          {voters.length > 0 && (
            <div className="space-y-3 border-t p-6 border-gray-200 pt-4">
              {voters.map((voter) => (
                <div
                  key={voter.user._id}
                  className="flex items-center gap-3 py-2"
                >
                  {/* User Avatar */}
                  <Avatar user={voter.user} size={10} />

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800">
                      {voter.user.firstName} {voter.user.lastName}
                    </div>
                    {voter.note && (
                      <div className="text-sm text-gray-600 mt-1">
                        <MultiLine>{voter.note}</MultiLine>
                      </div>
                    )}
                  </div>

                  {/* Points */}
                  <div className="text-xl font-bold text-gray-700 shrink-0">
                    {voter.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      );
    });
  }, [round, submissionsWithScores, user?._id, usersById]);

  return <div className="mt-4 space-y-6">{submissionMarkup}</div>;
}
