"use client";

import { useMemo, useState } from "react";
import {
  PopulatedLeague,
  PopulatedSubmission,
  PopulatedUser,
} from "@/lib/types";
import Card from "./Card";
import { Avatar } from "./Avatar";
import { twMerge } from "tailwind-merge";
import { getPlaces } from "@/lib/utils/getPlaces";
import AlbumArt from "./AlbumArt";
import { BlockQuote } from "./BlockQuote";

export function LeagueStandings({ league }: { league: PopulatedLeague }) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const standings = useMemo(() => {
    // Calculate total points for each user across all completed rounds
    const userPointsById = league.users.reduce((acc, user) => {
      acc[user._id] = { user, points: 0, wins: 0 };
      return acc;
    }, {} as Record<string, { user: PopulatedUser; points: number; wins: number }>);

    const submissionsBySubmissionId = league.rounds.completed
      .flatMap((round) => round.submissions)
      .reduce((acc, submission) => {
        acc[submission._id] = submission;
        return acc;
      }, {} as Record<string, PopulatedSubmission>);

    league.rounds.completed.forEach((round) => {
      const userPointsForRound: Record<string, number> = round.votes.reduce(
        (acc, vote) => {
          const submission = submissionsBySubmissionId[vote.submissionId];
          if (!submission) {
            return acc;
          }
          if (!acc[submission.userId]) {
            acc[submission.userId] = 0;
          }
          acc[submission.userId] += vote.points;
          return acc;
        },
        {} as Record<string, number>
      );

      const sortedUsers = [...league.users].sort((userA, userB) => {
        const pointsA = userPointsForRound[userA._id] || 0;
        const pointsB = userPointsForRound[userB._id] || 0;
        return pointsB - pointsA;
      });

      const highestPoints = userPointsForRound[sortedUsers[0]._id] || 0;
      league.users.forEach((user) => {
        const pointsForRound = userPointsForRound[user._id] || 0;
        userPointsById[user._id].points += pointsForRound;
        if (pointsForRound > highestPoints) {
          throw new Error(
            "Unexpected state: user has more points than highestPoints"
          );
        }
        if (pointsForRound === highestPoints && highestPoints > 0) {
          userPointsById[user._id].wins += 1;
        }
      });
    });

    return league.users
      .map((user) => userPointsById[user._id])
      .sort((a, b) => {
        if (b.points === a.points) {
          return b.wins - a.wins;
        }
        return b.points - a.points;
      });
  }, [league]);

  const guessStats = useMemo(() => {
    const usersById = league.users.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {} as Record<string, PopulatedUser>);

    const submissionsById = league.rounds.completed
      .flatMap((round) => round.submissions)
      .reduce((acc, submission) => {
        acc[submission._id] = submission;
        return acc;
      }, {} as Record<string, PopulatedSubmission>);

    // Calculate guess stats for each user
    const userGuessStats = league.users.map((user) => {
      const guesses: Array<{
        round: (typeof league.rounds.completed)[0];
        submission: PopulatedSubmission;
        guessedUser: PopulatedUser;
        actualUser: PopulatedUser;
        isCorrect: boolean;
        note?: string;
      }> = [];

      league.rounds.completed.forEach((round) => {
        // Find all votes by this user that have a guess
        const userVotes = round.votes.filter(
          (vote) => vote.userId === user._id && vote.userGuessId
        );

        userVotes.forEach((vote) => {
          const submission = submissionsById[vote.submissionId];
          if (!submission) return;

          const guessedUser = usersById[vote.userGuessId!];
          const actualUser = usersById[submission.userId];
          const isCorrect = vote.userGuessId === submission.userId;

          if (guessedUser && actualUser) {
            guesses.push({
              round,
              submission,
              guessedUser,
              actualUser,
              isCorrect,
              note: vote.note,
            });
          }
        });
      });

      const correctCount = guesses.filter((g) => g.isCorrect).length;
      const incorrectCount = guesses.filter((g) => !g.isCorrect).length;
      const totalGuesses = guesses.length;
      const accuracy =
        totalGuesses > 0 ? (correctCount / totalGuesses) * 100 : 0;

      return {
        user,
        guesses,
        correctCount,
        incorrectCount,
        totalGuesses,
        accuracy,
      };
    });

    // Sort by correct count descending, then by accuracy
    return userGuessStats.sort((a, b) => {
      if (b.correctCount !== a.correctCount) {
        return b.correctCount - a.correctCount;
      }
      return b.accuracy - a.accuracy;
    });
  }, [league]);

  if (league.rounds.completed.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          No completed rounds yet. Standings will appear once rounds are
          completed.
        </p>
      </div>
    );
  }

  const standingsMarkup = (() => {
    const places = getPlaces(standings.map((s) => s.points));

    return standings.map((standing, index) => {
      const currentPlace = places[index];
      const isFirst = currentPlace === 1;
      const isSecond = currentPlace === 2;
      const isThird = currentPlace === 3;
      const isOther = currentPlace > 3;

      return (
        <div
          key={standing.user._id}
          className={twMerge(
            "p-4 flex items-center gap-4",
            isFirst && "bg-yellow-50",
            isSecond && "bg-gray-100",
            isThird && "bg-orange-50",
            isOther && "bg-white"
          )}
        >
          {/* Rank */}
          <div className="flex items-center justify-center min-w-10">
            {isFirst && <span className="text-2xl">🥇</span>}
            {isSecond && <span className="text-2xl">🥈</span>}
            {isThird && <span className="text-2xl">🥉</span>}
            {isOther && (
              <span className="text-xl font-bold text-gray-500">
                {index + 1}
              </span>
            )}
          </div>

          {/* User Avatar */}
          <Avatar user={standing.user} size={12} />

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg text-gray-800">
              {standing.user.firstName} {standing.user.lastName}
            </div>
            <div className="text-sm text-gray-600">
              {standing.wins} {standing.wins === 1 ? "win" : "wins"}
            </div>
          </div>

          {/* Points */}
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-800">
              {standing.points}
            </div>
            <div className="text-sm text-gray-600">points</div>
          </div>
        </div>
      );
    });
  })();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          League Standings
        </h3>

        <Card variant="outlined">
          <div className="divide-y divide-gray-200">{standingsMarkup}</div>
        </Card>
      </div>

      {/* Guess Accuracy Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          Guess Accuracy
        </h3>

        <Card variant="outlined">
          <div className="divide-y divide-gray-200">
            {guessStats
              .filter((stat) => stat.totalGuesses > 0)
              .map((stat, index) => {
                const isExpanded = expandedUser === stat.user._id;

                return (
                  <div key={stat.user._id}>
                    {/* Summary Row */}
                    <button
                      onClick={() =>
                        setExpandedUser(isExpanded ? null : stat.user._id)
                      }
                      className="w-full flex items-center gap-4 hover:bg-gray-50 p-4 rounded transition-colors"
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center min-w-10">
                        <span className="text-lg font-bold text-gray-600">
                          #{index + 1}
                        </span>
                      </div>

                      {/* User Avatar */}
                      <Avatar user={stat.user} size={10} />

                      {/* User Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-semibold text-base text-gray-800">
                          {stat.user.firstName} {stat.user.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {stat.correctCount} correct • {stat.incorrectCount}{" "}
                          incorrect
                        </div>
                      </div>

                      {/* Accuracy */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-800">
                          {Math.round(stat.accuracy)}%
                        </div>
                        <div className="text-xs text-gray-600">accuracy</div>
                      </div>

                      {/* Expand Icon */}
                      <div className="text-gray-400">
                        <svg
                          className={`w-5 h-5 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="space-y-3 p-3">
                        {stat.guesses.map((guess, guessIdx) => (
                          <div
                            key={guessIdx}
                            className={twMerge(
                              "p-3 rounded-lg border flex flex-col gap-1",
                              guess.isCorrect
                                ? "bg-green-50 border-green-200"
                                : "bg-red-50 border-red-200"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              {/* Round */}
                              <div className="text-xs font-semibold text-gray-600">
                                Round {guess.round.roundIndex + 1}:{" "}
                                {guess.round.title}
                              </div>
                              {guess.isCorrect ? (
                                <div className="flex items-center gap-1 text-green-700">
                                  <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span className="font-semibold">
                                    Correct!
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-700">
                                  <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span className="font-semibold">
                                    Incorrect
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-start gap-3">
                              {/* Album Art */}
                              <AlbumArt
                                trackInfo={guess.submission.trackInfo}
                                round={guess.round}
                                size={60}
                              />

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                {/* Track */}
                                <div className="font-semibold text-sm text-gray-900">
                                  {guess.submission.trackInfo.title}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {guess.submission.trackInfo.artists.join(
                                    ", "
                                  )}
                                </div>

                                <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                                  <Avatar
                                    user={guess.actualUser}
                                    size={5}
                                    includeTooltip
                                    tooltipText={`Submitted by ${guess.actualUser.userName}`}
                                  />{" "}
                                  /{" "}
                                  <Avatar
                                    user={guess.guessedUser}
                                    size={5}
                                    includeTooltip
                                    tooltipText={`${stat.user.firstName} guessed ${guess.guessedUser.userName}`}
                                  />
                                  Submitted by {guess.actualUser.userName},{" "}
                                  {stat.user.firstName} guessed{" "}
                                  {guess.guessedUser.userName}
                                </div>

                                {guess.note && (
                                  <BlockQuote className="text-sm mb-2">
                                    {guess.note}
                                  </BlockQuote>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}
