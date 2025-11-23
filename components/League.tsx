"use client";

import { useMemo, useState } from "react";
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
import { DateTime } from "./DateTime";

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
    const allRounds = getAllRounds(league, {
      includePending: true,
      includeFake: false,
    });

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
      <div className="border-b border-gray-300 pb-4">
        <div className="flex flex-wrap items-center">
          <div className="flex items-center gap-2 grow">
            <MaybeLink
              href={`/leagues/${league._id}`}
              className="text-2xl font-bold mb-2"
            >
              {league.title}
            </MaybeLink>

            <Pill status={league.status}>{text}</Pill>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {league.users.map((user) => (
              <Avatar
                key={user._id}
                user={user}
                includeTooltip
                tooltipText={`${user.userName}'s profile`}
              />
            ))}
          </div>
        </div>
        <p className="text-gray-600 mb-3">
          <MultiLine>{league.description}</MultiLine>
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-x-2 text-sm text-gray-500">
            {league.status === "completed" && finalVoteTimestamp > 0 && (
              <>
                <DateTime prefix="League ended:">{finalVoteTimestamp}</DateTime>
                <span>•</span>
              </>
            )}
            {league.status === "upcoming" && (
              <>
                <DateTime prefix="League starting:">
                  {league.leagueStartDate}
                </DateTime>
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
