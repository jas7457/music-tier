"use client";

import { useAuth } from "@/lib/AuthContext";
import Card from "./Card";
import { formatDate } from "@/lib/utils/formatDate";
import { Round } from "./Round";
import { PopulatedLeague } from "@/lib/types";
import { MaybeLink } from "./MaybeLink";
import { Avatar } from "./Avatar";
import { MultiLine } from "./MultiLine";

export function LeagueRounds({ league }: { league: PopulatedLeague }) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const roundsMarkup = (() => {
    if (league.status === "completed") {
      return (
        <div className="flex flex-col gap-6">
          {league.rounds.completed.map((round) => (
            <Card key={round._id} className="p-4" variant="outlined">
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
        <Round
          key={league.rounds.current.stage}
          currentUser={user}
          round={league.rounds.current}
          league={league}
        />
      </div>
    );
  })();

  return (
    <div className="flex flex-col gap-6">
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
                key={round._id}
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

      {/* Pending Rounds */}
      {league.rounds.pending.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Pending Rounds
          </h3>
          <div className="space-y-3">
            {league.rounds.pending.map((round, index) => (
              <Card
                key={round._id || index}
                variant="outlined"
                className="border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div>
                    <div className="font-semibold">
                      Round {round.roundIndex + 1}
                      {round.title ? `: ${round.title}` : ""}
                    </div>

                    {round.description && (
                      <p className="text-gray-600 text-sm">
                        <MultiLine>{round.description}</MultiLine>
                      </p>
                    )}
                  </div>

                  <Avatar
                    user={round.creatorObject}
                    tooltipText={`Created by ${round.creatorObject.firstName}`}
                    includeTooltip
                  />
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
                key={round._id}
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
            No rounds submitted in this league.
          </p>
        )}
    </div>
  );
}
