"use client";

import { useMemo } from "react";
import {
  PopulatedLeague,
  PopulatedSubmission,
  PopulatedUser,
} from "@/lib/types";
import Card from "./Card";
import { Avatar } from "./Avatar";
import { twMerge } from "tailwind-merge";
import { getPlaces } from "@/lib/utils/getPlaces";

export function LeagueStandings({ league }: { league: PopulatedLeague }) {
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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-700">
        League Standings
      </h3>

      <Card variant="outlined">
        <div className="divide-y divide-gray-200">{standingsMarkup}</div>
      </Card>
    </div>
  );
}
