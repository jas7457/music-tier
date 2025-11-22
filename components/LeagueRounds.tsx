"use client";

import { useAuth } from "@/lib/AuthContext";
import Card from "./Card";
import { formatDate } from "@/lib/utils/formatDate";
import { Round } from "./Round";
import { PopulatedLeague, PopulatedRound } from "@/lib/types";
import { MaybeLink } from "./MaybeLink";
import { Avatar } from "./Avatar";
import { MultiLine } from "./MultiLine";
import { ListenResultsDuo } from "./ListenResultsDuo";

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

  const nonCurrentRoundsMarkup = (() => {
    const footerHelper = (round: PopulatedRound) => {
      const now = Date.now();
      return (
        <div className="flex gap-2">
          <span>
            Submissions {now > round.submissionStartDate ? "started" : "start"}:{" "}
            {formatDate(round.submissionStartDate)}
          </span>
          <span>•</span>
          <span>
            Submissions {now > round.submissionEndDate ? "ended" : "end"}:{" "}
            {formatDate(round.submissionEndDate)}
          </span>
          <span>•</span>
          <span>
            Round {now > round.votingEndDate ? "ended" : "ends"}:{" "}
            {formatDate(round.votingEndDate)}
          </span>
        </div>
      );
    };

    const groups: Array<{
      rounds: PopulatedRound[];
      title: string;
      footer: string | ((round: PopulatedRound) => React.ReactNode);
    }> = [
      {
        rounds: league.rounds.upcoming,
        title: "Upcoming Rounds",
        footer: footerHelper,
      },
      {
        rounds: league.rounds.pending,
        title: "Pending Rounds",
        footer: (round) => (
          <div>
            <div>
              Waiting for {round.creatorObject.firstName} to create this round.
            </div>
            {footerHelper(round)}
          </div>
        ),
      },
      {
        rounds: league.rounds.bonus,
        title: "Bonus Rounds",
        footer: footerHelper,
      },
      {
        rounds: league.status === "completed" ? [] : league.rounds.completed,
        title: "Completed Rounds",
        footer: (round) => `Round ended: ${formatDate(round.votingEndDate)}`,
      },
    ];

    return groups.map(({ rounds, title, footer }) => {
      if (rounds.length === 0) {
        return null;
      }

      return (
        <div key={title}>
          <h3 className="text-lg font-semibold mb-3 text-gray-700">{title}</h3>
          <div className="space-y-3">
            {rounds.map((round, index) => {
              const hasAllSubmissions =
                round.submissions.length === league.users.length;

              const roundTitle = (() => {
                if (round.title) {
                  return round.title;
                }
                if (round.stage === "upcoming") {
                  return "Pending";
                }

                return "";
              })();

              return (
                <Card
                  key={round._id || index}
                  variant="outlined"
                  className="border-gray-200 bg-gray-50 p-2 md:p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      {round._id ? (
                        <MaybeLink
                          className="font-semibold"
                          href={`/leagues/${league._id}/rounds/${round._id}`}
                        >
                          Round {round.roundIndex + 1}: {roundTitle}
                        </MaybeLink>
                      ) : (
                        <span className="font-semibold">
                          Round {round.roundIndex + 1}: {roundTitle}
                        </span>
                      )}
                    </div>

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
                    {typeof footer === "function" ? footer(round) : footer}
                  </div>

                  {hasAllSubmissions && (
                    <ListenResultsDuo league={league} round={round} />
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      );
    });
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Current Round */}
      {roundsMarkup}

      {nonCurrentRoundsMarkup}

      {/* No rounds message */}
      {!league.rounds.current &&
        league.rounds.completed.length === 0 &&
        league.rounds.upcoming.length === 0 &&
        league.rounds.bonus.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No rounds submitted in this league.
          </p>
        )}
    </div>
  );
}
