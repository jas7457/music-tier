"use client";

import { useAuth } from "@/lib/AuthContext";
import { useCallback, useMemo } from "react";
import Card from "./Card";
import { formatDate } from "@/lib/utils/formatDate";
import { Round } from "./Round";
import { PopulatedLeague } from "@/lib/types";
import { CreateRound } from "./CreateRound";
import { useRouter } from "next/navigation";
import { MaybeLink } from "./MaybeLink";

export function League({
  league,
  onDataSaved,
}: {
  league: PopulatedLeague;
  onDataSaved: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    router.refresh();
  }, [router]);

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
                round={round}
                league={league}
                onDataSaved={onDataSaved}
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
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-green-700">
          Current Round
        </h3>
        <Card className="border-green-200 bg-green-50 p-4">
          <Round
            currentUser={user}
            round={league.rounds.current}
            league={league}
            onDataSaved={fetchData}
          />
        </Card>
      </div>
    );
  })();

  const createRoundMarkup = (() => {
    // Only show if user hasn't created their round yet
    if (userHasCreatedRound) {
      return null;
    }

    return (
      <div className="mb-6">
        <CreateRound leagueId={league._id} onRoundCreated={fetchData} />
      </div>
    );
  })();

  const { text, color } = (() => {
    switch (league.status) {
      case "active":
        return { text: "Active", color: "bg-green-100 text-green-800" };
      case "completed":
        return {
          text: "Completed",
          color: "bg-gray-200 text-gray-700",
        };
      case "upcoming":
        return { text: "Upcoming", color: "bg-blue-100 text-blue-800" };
      default:
        return { text: "Unknown", color: "" };
    }
  })();

  return (
    <>
      {/* League Header */}
      <div className="border-b pb-4 mb-6">
        <MaybeLink
          href={`/leagues/${league._id}`}
          className="flex items-center text-2xl font-bold mb-2"
        >
          {league.title}

          <span
            className={`ml-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${color}`}
          >
            {text}
          </span>
        </MaybeLink>
        <p className="text-gray-600 mb-3">{league.description}</p>
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{league.numberOfRounds} rounds</span>
          <span>•</span>
          <span>{league.daysForSubmission} days for submissions</span>
          <span>•</span>
          <span>{league.daysForVoting} days for voting</span>
        </div>
      </div>

      {/* Current Round */}
      {roundsMarkup}

      {/* Create Round */}
      {createRoundMarkup}

      {/* Completed Rounds */}
      {league.rounds.completed.length > 0 && league.status !== "completed" && (
        <div className="mb-6">
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
                <MaybeLink
                  href={`/leagues/${league._id}/rounds/${round._id}`}
                  className="font-semibold mb-1"
                >
                  Round {round.roundIndex + 1}: {round.title}
                </MaybeLink>
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

      {/* Upcoming Rounds */}
      {league.rounds.upcoming.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-700">
            Upcoming Rounds
          </h3>
          <div className="space-y-3">
            {league.rounds.upcoming.map((round) => (
              <Card
                key={round._id.toString()}
                className="border-blue-200 bg-blue-50 p-4"
              >
                <MaybeLink
                  href={`/leagues/${league._id}/rounds/${round._id}`}
                  className="font-semibold mb-1"
                >
                  Round {round.roundIndex + 1}: {round.title}
                </MaybeLink>
                <p className="text-gray-600 text-sm mb-2">
                  {round.description}
                </p>
                <div className="text-xs text-gray-500">
                  Submissions start: {formatDate(round.submissionStartDate)}
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
    </>
  );
}
