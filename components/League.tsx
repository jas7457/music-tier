"use client";

import { useAuth } from "@/lib/AuthContext";
import { useMemo } from "react";
import Card from "./Card";
import { formatDate } from "@/lib/utils/formatDate";
import { Round } from "./Round";
import { PopulatedLeague } from "@/lib/types";
import { CreateRound } from "./CreateRound";
import { MaybeLink } from "./MaybeLink";
import { Avatar } from "./Avatar";
import { MultiLine } from "./MultiLine";
import { Pill } from "./Pill";

export function League({ league }: { league: PopulatedLeague }) {
  const { user } = useAuth();

  const userHasCreatedRound = useMemo(() => {
    if (!user) {
      return false;
    }

    // Check if user has created their round for this league
    const allRounds = [
      league.rounds.current,
      ...league.rounds.upcoming,
      ...league.rounds.completed,
    ].filter((r) => r !== undefined);

    return allRounds.some((round) => round.creatorId === user._id);
  }, [league.rounds, user]);

  if (!user) {
    return null;
  }

  const roundsMarkup = (() => {
    if (league.status === "completed") {
      return (
        <div className="flex flex-col gap-6">
          {league.rounds.completed.map((round) => (
            <Card key={round._id.toString()} className="p-4" variant="outlined">
              <Round
                key={round.stage}
                round={round}
                league={league}
                currentUser={user}
              />
            </Card>
          ))}
        </div>
      );
    }

    if (!league.rounds.current) {
      return null;
    }

    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-green-700">
          Current Round
        </h3>
        <Card className="border-green-200 bg-green-50 p-4" variant="outlined">
          <Round
            key={league.rounds.current.stage}
            currentUser={user}
            round={league.rounds.current}
            league={league}
          />
        </Card>
      </div>
    );
  })();

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

      {/* Current Round */}
      {roundsMarkup}

      {/* Upcoming Rounds */}
      {league.rounds.upcoming.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-purple-700">
            Upcoming Rounds
          </h3>
          <div className="space-y-3">
            {league.rounds.upcoming.map((round) => (
              <Card
                key={round._id.toString()}
                variant="outlined"
                className="border-purple-200 bg-purple-50 p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <MaybeLink
                    href={`/leagues/${league._id}/rounds/${round._id}`}
                    className="font-semibold"
                  >
                    Round {round.roundIndex + 1}: {round.title}
                  </MaybeLink>

                  <Avatar
                    user={round.creatorObject}
                    tooltipText={`Created by ${round.creatorObject.firstName}`}
                    includeTooltip
                  />
                </div>
                <p className="text-gray-600 text-sm mb-2">
                  <MultiLine>{round.description}</MultiLine>
                </p>
                <div className="text-xs text-gray-500">
                  Submissions start: {formatDate(round.submissionStartDate)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Rounds */}
      {league.rounds.completed.length > 0 && league.status !== "completed" && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Completed Rounds
          </h3>
          <div className="space-y-3">
            {league.rounds.completed.map((round) => (
              <Card
                key={round._id.toString()}
                variant="outlined"
                className="bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <MaybeLink
                    href={`/leagues/${league._id}/rounds/${round._id}`}
                    className="font-semibold"
                  >
                    Round {round.roundIndex + 1}: {round.title}
                  </MaybeLink>
                  <Avatar
                    user={round.creatorObject}
                    tooltipText={`Submitted by ${round.creatorObject.firstName}`}
                    includeTooltip
                  />
                </div>

                <p className="text-gray-600 text-sm mb-2">
                  {round.description}
                </p>
                <div className="text-xs text-gray-500">
                  Ended: {formatDate(round.votingEndDate)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No rounds message */}
      {!league.rounds.current &&
        league.rounds.completed.length === 0 &&
        league.rounds.upcoming.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No rounds yet in this league.
          </p>
        )}
    </div>
  );
}
