"use client";

import { useMemo } from "react";
import AlbumArt from "./AlbumArt";
import Card from "./Card";
import { PopulatedRound, PopulatedUser } from "@/lib/types";
import { Avatar } from "./Avatar";
import { MultiLine } from "./MultiLine";
import { useAuth } from "@/lib/AuthContext";
import { BlockQuote } from "./BlockQuote";
import { twMerge } from "tailwind-merge";
import { getPlaces } from "@/lib/utils/getPlaces";
import { GuessFeedback } from "./GuessFeedback";

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
        .filter((voter) => voter.user)
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
    const places = getPlaces(submissionsWithScores.map((s) => s.totalPoints));

    return submissionsWithScores.map(
      ({ submission, totalPoints, voters }, index) => {
        const { emoji, cardClassName, innerClassName } = (() => {
          const currentPlace = places[index];

          const isFirst = currentPlace === 1;
          const isSecond = currentPlace === 2;
          const isThird = currentPlace === 3;

          if (isFirst) {
            return {
              emoji: "🥇",
              cardClassName: "border-2 border-yellow-400 bg-yellow-50",
              innerClassName: "border-yellow-400",
            };
          } else if (isSecond) {
            return {
              emoji: "🥈",
              cardClassName: "border-2 border-gray-400 bg-gray-50",
              innerClassName: "border-gray-400",
            };
          } else if (isThird) {
            return {
              emoji: "🥉",
              cardClassName: "border-2 border-[#cd7f32] bg-[#f9f2ec]",
              innerClassName: "border-[#cd7f32]",
            };
          } else {
            return {
              emoji: "",
              cardClassName: "",
              innerClassName: "",
            };
          }
        })();

        const submitter = usersById[submission.userId];
        const yourVote = round.votes.find(
          (vote) =>
            vote.userId === user?._id && vote.submissionId === submission._id
        );

        const votersWithPoints = voters.filter((voter) => voter.points > 0);

        return (
          <Card
            key={submission._id}
            className={twMerge("relative", cardClassName)}
          >
            {/* Submission Header */}
            <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[auto_1fr_auto] gap-4 p-4 sm:p-6">
              {/* Album Art */}
              <div className="col-span-2 sm:col-span-1 flex justify-center sm:justify-start">
                <AlbumArt submission={submission} size={120} round={round} />
              </div>

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
                <div className="flex items-center gap-1">
                  <Avatar user={usersById[submission.userId]} size={6} />
                  <p className="text-sm text-gray-600">
                    Submitted by {usersById[submission.userId].userName}
                  </p>
                </div>

                {submission.note && (
                  <p className="text-sm text-gray-700 italic">
                    &quot;<MultiLine>{submission.note}</MultiLine>&quot;
                  </p>
                )}
              </div>

              {/* Score */}
              <div className="flex flex-col gap-2 items-end">
                <div className="text-right">
                  <div className="text-4xl font-bold text-yellow-600">
                    {totalPoints} pts
                  </div>
                  <div className="text-sm text-gray-600">
                    {votersWithPoints.length}{" "}
                    {votersWithPoints.length === 1 ? "voter" : "voters"}
                  </div>
                </div>

                {yourVote?.userGuessObject && (
                  <div className="relative">
                    <Avatar
                      user={yourVote.userGuessObject}
                      size={6}
                      tooltipText={`Your guess: ${yourVote.userGuessObject.firstName} ${yourVote.userGuessObject.lastName}`}
                      includeTooltip
                    />
                    <GuessFeedback
                      className="absolute -top-1 -right-1"
                      isCorrect={
                        yourVote.userGuessObject._id === submission.userId
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Winner Badge */}
            {submitter && emoji && (
              <div
                className={twMerge(
                  "absolute -top-4 -left-4 bg-white rounded-full border-2 text-3xl w-12 h-12 grid items-center justify-items-center",
                  innerClassName
                )}
              >
                {emoji}
              </div>
            )}

            {/* Voters List */}
            {voters.length > 0 && (
              <div className="space-y-3 border-t p-6 border-gray-200 pt-4">
                {voters
                  .filter((voter) => voter.points > 0 || voter.note)
                  .map((voter) => (
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
                            <BlockQuote>{voter.note}</BlockQuote>
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
      }
    );
  }, [round, submissionsWithScores, user?._id, usersById]);

  return <div className="space-y-6">{submissionMarkup}</div>;
}
