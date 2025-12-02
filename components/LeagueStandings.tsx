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
import { useAuth } from "@/lib/AuthContext";
import { getRoundTitle } from "@/lib/utils/getRoundTitle";
import { Expandable } from "./Expandable";

export function LeagueStandings({ league }: { league: PopulatedLeague }) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const { user } = useAuth();

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

    // Sort by accuracy then correct count then fewest incorrect
    return userGuessStats.sort((a, b) => {
      if (b.accuracy !== a.accuracy) {
        return b.accuracy - a.accuracy;
      }
      if (b.correctCount !== a.correctCount) {
        return b.correctCount - a.correctCount;
      }
      return a.incorrectCount - b.incorrectCount;
    });
  }, [league]);

  const completedMarkup = useMemo(() => {
    if (league.status !== "completed") {
      return null;
    }

    const userPointsById = league.users.reduce((acc, user) => {
      acc[user._id] = { user, points: 0 };
      return acc;
    }, {} as Record<string, { user: PopulatedUser; points: number }>);

    league.rounds.completed.forEach((round) => {
      const submissionsById = round.submissions.reduce((acc, submission) => {
        acc[submission._id] = submission;
        return acc;
      }, {} as Record<string, PopulatedSubmission>);
      round.votes.forEach((vote) => {
        const submission = submissionsById[vote.submissionId];
        if (!submission || submission.userId !== user?._id) {
          return;
        }
        userPointsById[vote.userId].points += vote.points;
      });
    });

    const sortedUsers = Object.values(userPointsById)
      .sort((a, b) => b.points - a.points)
      .filter((item) => item.user._id !== user?._id);

    const biggestFan = sortedUsers[0];
    const biggestCritic = sortedUsers[sortedUsers.length - 1];

    const yourStandingIndex = standings.findIndex(
      (standing) => standing.user._id === user?._id
    );

    const places = getPlaces(standings.map((s) => s.points));
    const yourStanding = standings[yourStandingIndex];
    const yourPlace = places[yourStandingIndex];

    const suffix = (() => {
      const lastDigit = yourPlace % 10;
      switch (lastDigit) {
        case 1:
          return yourPlace === 11 ? "th" : "st";
        case 2:
          return yourPlace === 12 ? "th" : "nd";
        case 3:
          return yourPlace === 13 ? "th" : "rd";
        default:
          return "th";
      }
    })();
    const placeText = `${yourPlace}${suffix}`;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <h3 className="text-3xl font-bold text-gray-900">
            That&apos;s a wrap!
          </h3>
          <p className="text-gray-600">The competition was fierce!</p>
          <p className="text-base text-gray-800">
            You finished the{" "}
            <span className="font-semibold">{league.title}</span> league in{" "}
            <span className="font-semibold">{placeText} place</span> with{" "}
            <span className="font-semibold">
              {yourStanding?.points || 0} points
            </span>
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 justify-center">
          {biggestFan && (
            <div className="flex flex-col items-center space-y-3">
              {/* Ribbon Banner */}
              <div className="relative inline-block mx-10">
                <div className="bg-primary-lighter border-2 border-primary px-8 py-2 text-center">
                  <div className="text-sm font-bold text-primary-darker uppercase tracking-wide">
                    Your Biggest Fan
                  </div>
                </div>
                {/* Left ribbon tail */}
                <div className="absolute left-0 top-0 -translate-x-full h-full w-6">
                  <div className="absolute inset-0 bg-primary-lighter border-y-2 border-l-2 border-primary origin-right transform -skew-y-12"></div>
                </div>
                {/* Right ribbon tail */}
                <div className="absolute right-0 top-0 translate-x-full h-full w-6">
                  <div className="absolute inset-0 bg-primary-lighter border-y-2 border-r-2 border-primary origin-left transform skew-y-12"></div>
                </div>
              </div>

              {/* Avatar */}
              <Avatar className="text-3xl" user={biggestFan.user} size={24} />

              {/* Username */}
              <div className="text-2xl font-bold text-gray-900">
                {biggestFan.user.userName}
              </div>

              {/* Points */}
              <div className="text-gray-600">
                {biggestFan.points} upvote{biggestFan.points !== 1 ? "s" : ""}{" "}
                for you
              </div>
            </div>
          )}

          {biggestCritic && (
            <div className="flex flex-col items-center space-y-3">
              {/* Ribbon Banner */}
              <div className="relative inline-block mx-10">
                <div className="bg-gray-200 border-2 border-gray-400 px-8 py-2 text-center">
                  <div className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                    Your Biggest Critic
                  </div>
                </div>
                {/* Left ribbon tail */}
                <div className="absolute left-0 top-0 -translate-x-full h-full w-6">
                  <div className="absolute inset-0 bg-gray-200 border-y-2 border-l-2 border-gray-400 origin-right transform -skew-y-12"></div>
                </div>
                {/* Right ribbon tail */}
                <div className="absolute right-0 top-0 translate-x-full h-full w-6">
                  <div className="absolute inset-0 bg-gray-200 border-y-2 border-r-2 border-gray-400 origin-left transform skew-y-12"></div>
                </div>
              </div>

              {/* Avatar */}
              <Avatar
                className="text-3xl"
                user={biggestCritic.user}
                size={24}
              />

              {/* Username */}
              <div className="text-2xl font-bold text-gray-900">
                {biggestCritic.user.userName}
              </div>

              {/* Points */}
              <div className="text-gray-600">
                {biggestCritic.points} upvote
                {biggestCritic.points !== 1 ? "s" : ""} for you
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [
    league.rounds.completed,
    league.status,
    league.users,
    league.title,
    standings,
    user?._id,
  ]);

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
            "p-2 md:p-4 flex items-center gap-2 md:gap-4",
            isFirst && "border border-yellow-400 bg-yellow-50",
            isSecond && "border border-gray-400 bg-gray-50",
            isThird && "border border-[#cd7f32] bg-[#f9f2ec]",
            isOther && "border border-gray-400 bg-white",
            index === 0 && "rounded-t-lg",
            index === standings.length - 1 && "rounded-b-lg"
          )}
        >
          {/* Rank */}
          <div className="flex items-center justify-center min-w-10">
            {isFirst && <span className="text-4xl">🥇</span>}
            {isSecond && <span className="text-4xl">🥈</span>}
            {isThird && <span className="text-4xl">🥉</span>}
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
              {standing.user.userName}
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

  const filteredGuesses = guessStats.filter((stat) => stat.totalGuesses > 0);

  return (
    <div className="space-y-6">
      {completedMarkup}

      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          League Standings
        </h3>

        <Card variant="outlined" className="overflow-clip">
          {standingsMarkup}
        </Card>
      </div>

      {/* Guess Accuracy Section */}
      {filteredGuesses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Guess Accuracy
          </h3>

          <Card variant="outlined">
            <div className="divide-y divide-gray-200">
              {filteredGuesses.map((stat, index) => {
                const isExpanded = expandedUsers.has(stat.user._id);

                // Group guesses by round
                const guessesByRound = stat.guesses.reduce(
                  (acc, guess) => {
                    const roundId = guess.round._id;
                    if (!acc[roundId]) {
                      acc[roundId] = {
                        round: guess.round,
                        guesses: [],
                      };
                    }
                    acc[roundId].guesses.push(guess);
                    return acc;
                  },
                  {} as Record<
                    string,
                    {
                      round: (typeof stat.guesses)[0]["round"];
                      guesses: typeof stat.guesses;
                    }
                  >
                );

                return (
                  <div key={stat.user._id}>
                    {/* Summary Row */}
                    <button
                      onClick={() =>
                        setExpandedUsers((prev) => {
                          const next = new Set(prev);
                          if (next.has(stat.user._id)) {
                            next.delete(stat.user._id);
                          } else {
                            next.add(stat.user._id);
                          }
                          return next;
                        })
                      }
                      className="w-full flex items-center gap-2 md:gap-4 hover:bg-gray-50 p-2 md:p-4 rounded transition-colors"
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
                          {stat.user.userName}
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
                          className={twMerge(
                            "w-5 h-5 transition-transform",
                            isExpanded ? "rotate-180" : ""
                          )}
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
                    <Expandable isExpanded={isExpanded}>
                      <div className="space-y-4 p-3">
                        {Object.values(guessesByRound).map(
                          ({ round, guesses }) => (
                            <div key={round._id} className="space-y-2">
                              {/* Round Title */}
                              <div className="text-sm font-semibold text-gray-600">
                                {getRoundTitle(round)}
                              </div>

                              {/* Guesses for this round */}
                              <div className="space-y-2">
                                {guesses.map((guess, guessIdx) => {
                                  const guesserText =
                                    user?._id === stat.user._id
                                      ? { capitalized: "You", normal: "you" }
                                      : {
                                          capitalized: stat.user.userName,
                                          normal: stat.user.userName,
                                        };

                                  return (
                                    <div
                                      key={guessIdx}
                                      className={twMerge(
                                        "p-2 md:p-3 rounded-lg border flex flex-col gap-1",
                                        guess.isCorrect
                                          ? "bg-green-50 border-green-200"
                                          : "bg-red-50 border-red-200"
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
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
                                          submission={guess.submission}
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
                                            <div className="shrink-0">
                                              <Avatar
                                                user={guess.actualUser}
                                                size={5}
                                                includeTooltip
                                                tooltipText={`Submitted by ${guess.actualUser.userName}`}
                                                includeLink={false}
                                              />
                                            </div>{" "}
                                            /{" "}
                                            <div className="shrink-0">
                                              <Avatar
                                                user={guess.guessedUser}
                                                size={5}
                                                includeTooltip
                                                tooltipText={`${guesserText.capitalized} guessed ${guess.guessedUser.userName}`}
                                                includeLink={false}
                                              />
                                            </div>
                                            Submitted by{" "}
                                            {guess.actualUser.userName},{" "}
                                            {guesserText.normal} guessed{" "}
                                            {guess.guessedUser.userName}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </Expandable>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
