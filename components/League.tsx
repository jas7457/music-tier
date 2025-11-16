"use client";

import { useMemo, useState, ViewTransition } from "react";
import { PopulatedLeague, PopulatedUser } from "@/lib/types";
import { CreateRound } from "./CreateRound";
import { MaybeLink } from "./MaybeLink";
import { Avatar } from "./Avatar";
import { MultiLine } from "./MultiLine";
import { Pill } from "./Pill";
import { LeagueRounds } from "./LeagueRounds";
import { LeagueStandings } from "./LeagueStandings";
import { ToggleButton } from "./ToggleButton";
import { getAllRounds } from "@/lib/utils/getAllRounds";
import { formatDate } from "@/lib/utils/formatDate";

export function League({
  league,
  user,
}: {
  league: PopulatedLeague;
  user: PopulatedUser;
}) {
  const [showStandings, setShowStandings] = useState(
    league.status === "completed"
  );

  const { userHasCreatedRound, userHasCreatedBonusRound } = useMemo(() => {
    if (!user) {
      return { userHasCreatedRound: false, userHasCreatedBonusRound: false };
    }

    // Check if user has created their round for this league
    const allRounds = [
      ...getAllRounds(league),
      ...league.rounds.pending.filter((round) => round._id),
    ];

    return allRounds.reduce(
      (acc, round) => {
        if (round.creatorId !== user._id) {
          return acc;
        }
        if (round.isBonusRound) {
          acc.userHasCreatedBonusRound = true;
        } else {
          acc.userHasCreatedRound = true;
        }
        return acc;
      },
      { userHasCreatedRound: false, userHasCreatedBonusRound: false }
    );
  }, [league, user]);

  const finalVoteTimestamp = useMemo(() => {
    const allVotes = league.rounds.completed.flatMap((round) => round.votes);
    return allVotes.reduce(
      (latest, vote) => Math.max(latest, vote.voteDate),
      0
    );
  }, [league]);

  if (!user) {
    return null;
  }

  const text = (() => {
    switch (league.status) {
      case "active":
        return "Active";
      case "completed":
        return "Completed";
      case "upcoming":
        return "Upcoming";
      case "pending":
        return "Pending";
      default:
        return "Unexpected league status. If you see this, tell Jason";
    }
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* League Header */}
      <div>
        <div className="flex flex-wrap items-center">
          <div className="flex items-center gap-2 grow">
            <ViewTransition name={`league-${league._id}.title`}>
              <MaybeLink
                href={`/leagues/${league._id}`}
                className="text-2xl font-bold mb-2"
              >
                {league.title}
              </MaybeLink>
            </ViewTransition>

            <ViewTransition name={`league-${league._id}.status`}>
              <Pill status={league.status}>{text}</Pill>
            </ViewTransition>
          </div>
          <ViewTransition name={`league-${league._id}.users`}>
            <div className="flex flex-wrap items-center gap-1">
              {league.users.map((user) => (
                <Avatar key={user._id} user={user} includeTooltip />
              ))}
            </div>
          </ViewTransition>
        </div>
        <ViewTransition name={`league-${league._id}.description`}>
          <p className="text-gray-600 mb-3">
            <MultiLine>{league.description}</MultiLine>
          </p>
        </ViewTransition>

        <ViewTransition name={`league-${league._id}.details`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2 text-sm text-gray-500">
              {league.status === "completed" && finalVoteTimestamp > 0 && (
                <>
                  <span>League ended: {formatDate(finalVoteTimestamp)}</span>
                  <span>•</span>
                </>
              )}
              <span>{league.numberOfRounds} rounds</span>
              <span>•</span>
              <span>{league.daysForSubmission} days for submissions</span>
              <span>•</span>
              <span>{league.daysForVoting} days for voting</span>
            </div>

            {/* Toggle between Rounds and Standings */}
            <div className="flex gap-2">
              <ToggleButton
                onClick={() => setShowStandings(false)}
                selected={!showStandings}
              >
                Rounds
              </ToggleButton>
              <ToggleButton
                onClick={() => setShowStandings(true)}
                selected={showStandings}
              >
                Standings
              </ToggleButton>
            </div>
          </div>
        </ViewTransition>

        <ViewTransition name={`league-${league._id}.divider`}>
          <div className="pt-4 border-b border-gray-300" />
        </ViewTransition>
      </div>

      {/* Create Round */}
      {userHasCreatedRound ? null : (
        <CreateRound leagueId={league._id} isBonusRound={false} />
      )}

      {/* Create Bonus Round */}
      {user.canCreateBonusRound && !userHasCreatedBonusRound && (
        <CreateRound leagueId={league._id} isBonusRound={true} />
      )}

      {/* Content */}
      {showStandings ? (
        <LeagueStandings league={league} />
      ) : (
        <LeagueRounds league={league} />
      )}
    </div>
  );
}
