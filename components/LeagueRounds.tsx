"use client";

import { useAuth } from "@/lib/AuthContext";
import Card from "./Card";
import { Round } from "./Round";
import { PopulatedLeague, PopulatedRound } from "@/lib/types";
import { ListenResultsDuo } from "./ListenResultsDuo";
import { RoundInfo } from "./RoundInfo";

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
                isRoundPage={false}
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
        <h3 className="text-lg font-semibold mb-3 text-primary-dark">
          Current Round
        </h3>
        <Round
          key={league.rounds.current.stage}
          currentUser={user}
          round={league.rounds.current}
          league={league}
          isRoundPage={false}
        />
      </div>
    );
  })();

  const nonCurrentRoundsMarkup = (() => {
    const groups: Array<{
      rounds: PopulatedRound[];
      title: string;
      roundInfo: (round: PopulatedRound) => React.ReactNode;
    }> = [
      {
        rounds: league.rounds.upcoming,
        title: "Upcoming Rounds",
        roundInfo: (round) => <RoundInfo round={round} league={league} />,
      },
      {
        rounds: league.rounds.pending,
        title: "Pending Rounds",
        roundInfo: (round) => (
          <div className="flex flex-col gap-2">
            <RoundInfo round={round} league={league} />

            {round._id ? (
              <div>Waiting for others to create their rounds.</div>
            ) : (
              <div>
                Waiting for {round.creatorObject.userName} to create their
                round.
              </div>
            )}
          </div>
        ),
      },
      {
        rounds: league.rounds.bonus,
        title: "Bonus Rounds",
        roundInfo: (round) => (
          <div className="flex flex-col gap-2">
            <RoundInfo round={round} league={league} />

            {!round._id && (
              <div>
                Waiting for {round.creatorObject.userName} to create their bonus
                round.
              </div>
            )}
          </div>
        ),
      },
      {
        rounds: league.status === "completed" ? [] : league.rounds.completed,
        title: "Completed Rounds",
        roundInfo: (round) => <RoundInfo round={round} league={league} />,
      },
    ];

    return groups.map(({ rounds, title, roundInfo }) => {
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

              return (
                <Card
                  key={round._id || index}
                  variant="outlined"
                  className="border-gray-200 bg-gray-50 p-2 md:p-4 flex flex-col gap-4"
                >
                  {roundInfo(round)}

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
