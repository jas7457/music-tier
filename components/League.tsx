"use client";

import { useAuth } from "@/lib/AuthContext";
import { useMemo, useState } from "react";
import { PopulatedLeague } from "@/lib/types";
import { CreateRound } from "./CreateRound";
import { MaybeLink } from "./MaybeLink";
import { Avatar } from "./Avatar";
import { MultiLine } from "./MultiLine";
import { Pill } from "./Pill";
import { LeagueRounds } from "./LeagueRounds";
import { LeagueStandings } from "./LeagueStandings";
import { ToggleButton } from "./ToggleButton";
import { getAllRounds } from "@/lib/utils/getAllRounds";

export function League({ league }: { league: PopulatedLeague }) {
  const { user } = useAuth();
  const [showStandings, setShowStandings] = useState(false);

  const userHasCreatedRound = useMemo(() => {
    if (!user) {
      return false;
    }

    // Check if user has created their round for this league
    const allRounds = getAllRounds(league);

    return allRounds.some((round) => round.creatorId === user._id);
  }, [league, user]);

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
      <div className="border-b pb-4">
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
              <Avatar key={user._id} user={user} includeTooltip />
            ))}
          </div>
        </div>
        <p className="text-gray-600 mb-3">
          <MultiLine>{league.description}</MultiLine>
        </p>

        <div className="flex gap-4 text-sm text-gray-500">
          <span>{league.numberOfRounds} rounds</span>
          <span>•</span>
          <span>{league.daysForSubmission} days for submissions</span>
          <span>•</span>
          <span>{league.daysForVoting} days for voting</span>
        </div>
      </div>

      {/* Create Round */}
      {userHasCreatedRound ? null : <CreateRound leagueId={league._id} />}

      {/* Toggle between Rounds and Standings */}
      <div className="flex justify-center gap-2">
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

      {/* Content */}
      {showStandings ? (
        <LeagueStandings league={league} />
      ) : (
        <LeagueRounds league={league} />
      )}
    </div>
  );
}
