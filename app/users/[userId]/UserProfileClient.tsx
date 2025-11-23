"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { MaybeLink } from "@/components/MaybeLink";
import {
  PopulatedLeague,
  PopulatedRound,
  PopulatedSubmission,
  PopulatedUser,
} from "@/lib/types";
import { twMerge } from "tailwind-merge";
import AlbumArt from "@/components/AlbumArt";
import { Pill } from "@/components/Pill";
import { assertNever } from "@/lib/utils/never";
import Card, { CardProps } from "@/components/Card";
import { HapticButton } from "@/components/HapticButton";
import { DateTime } from "@/components/DateTime";

type LeagueInfo = {
  leagueId: string;
  leagueName: string;
  points: number;
};

type SubmissionInfo = {
  league: PopulatedLeague;
  round: PopulatedRound;
  submission: PopulatedSubmission;
  points: number;
};

export type ProfileData = {
  user: PopulatedUser;
  currentLeagues: Array<PopulatedLeague & { yourPoints: number }>;
  pastLeagues: Array<PopulatedLeague & { yourPoints: number }>;
  stats: {
    totalPoints: number;
    totalPointsDetails: Array<SubmissionInfo>;
    firstPlaceLeagues: Array<LeagueInfo>;
    secondPlaceLeagues: Array<LeagueInfo>;
    thirdPlaceLeagues: Array<LeagueInfo>;
    mostVotedSongDetails: Array<SubmissionInfo>;
    pointsPerLeague: Array<{
      league: PopulatedLeague;
      points: number;
    }>;
    totalLeagues: number;
    completedLeagues: number;
  };
};

type UserProfileClientProps = {
  profileData: ProfileData;
};

export function UserProfileClient({ profileData }: UserProfileClientProps) {
  const { user, currentLeagues, pastLeagues, stats } = profileData;
  const fullName = `${user.firstName} ${user.lastName}`;
  const [expandedStat, setExpandedStat] = useState<
    | "totalPoints"
    | "firstPlace"
    | "secondPlace"
    | "thirdPlace"
    | "mostVoted"
    | "totalLeagues"
    | "completedLeagues"
    | "avgPoints"
    | null
  >(null);

  const toggleStat = (statName: typeof expandedStat) => {
    setExpandedStat(expandedStat === statName ? null : statName);
  };

  const expandedView = useMemo(() => {
    switch (expandedStat) {
      case null: {
        return null;
      }
      case "totalPoints": {
        return (
          <SubmissionsCards
            title="Points Breakdown by Submission"
            details={stats.totalPointsDetails}
          />
        );
      }
      case "firstPlace": {
        return (
          <PlacementCard
            user={user}
            placement="1st"
            icon="🥇"
            leagues={stats.firstPlaceLeagues}
          />
        );
      }
      case "secondPlace": {
        return (
          <PlacementCard
            user={user}
            placement="2nd"
            icon="🥈"
            leagues={stats.secondPlaceLeagues}
          />
        );
      }
      case "thirdPlace": {
        return (
          <PlacementCard
            user={user}
            placement="3rd"
            icon="🥉"
            leagues={stats.thirdPlaceLeagues}
          />
        );
      }
      case "mostVoted": {
        return (
          <SubmissionsCards
            title="Most Voted Songs"
            details={stats.mostVotedSongDetails}
          />
        );
      }
      case "totalLeagues": {
        return <LeaguesCards leagues={[...currentLeagues, ...pastLeagues]} />;
      }
      case "completedLeagues": {
        return (
          <LeaguesCards
            leagues={pastLeagues.filter(
              (league) => league.status === "completed"
            )}
          />
        );
      }
      case "avgPoints": {
        return (
          <GenericStatCard>
            <h3 className="font-semibold mb-3">Points Per League</h3>
            {stats.pointsPerLeague.length === 0 ? (
              <div>{user.firstName} has no points in any leagues yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.pointsPerLeague
                  .sort((a, b) => b.points - a.points)
                  .map((league) => (
                    <MaybeLink
                      key={league.league._id}
                      href={`/leagues/${league.league._id}`}
                      className="p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {league.league.title}
                        </span>
                        <span className="text-lg font-bold">
                          {league.points} pts
                        </span>
                      </div>
                    </MaybeLink>
                  ))}
              </div>
            )}
          </GenericStatCard>
        );
      }
      default: {
        assertNever(expandedStat);
      }
    }
  }, [expandedStat, stats, user, currentLeagues, pastLeagues]);

  return (
    <div className="flex flex-col gap-6">
      {/* User Header */}
      <div className="border-b border-gray-300 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <Avatar user={user} size={20} className="text-3xl" />
          <div>
            <h1 className="text-3xl font-bold">{fullName}</h1>
            <p className="text-gray-600">{user.userName}</p>
            <p className="text-sm text-gray-500">
              Joined <DateTime>{user.signupDate}</DateTime>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Stats</h2>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {(
              [
                {
                  label: "Total Points",
                  value: stats.totalPoints,
                  info: "Total points across all completed and ongoing leagues",
                  icon: "🏆",
                  stat: "totalPoints",
                },
                {
                  label: "1st Place",
                  value: stats.firstPlaceLeagues.length,
                  info: "Number of completed leagues where you placed 1st",
                  icon: "🥇",
                  stat: "firstPlace",
                },
                {
                  label: "2nd Place",
                  info: "Number of completed leagues where you placed 2nd",
                  value: stats.secondPlaceLeagues.length,
                  icon: "🥈",
                  stat: "secondPlace",
                },
                {
                  label: "3rd Place",
                  info: "Number of completed leagues where you placed 3rd",
                  value: stats.thirdPlaceLeagues.length,
                  icon: "🥉",
                  stat: "thirdPlace",
                },
                {
                  label: "Most Voted Songs",
                  info: "Number of your submissions that received the most points in their rounds",
                  value: stats.mostVotedSongDetails.length,
                  icon: "⭐",
                  stat: "mostVoted",
                },
                {
                  label: "Total Leagues",
                  info: "Total number of completed and ongoing leagues you have participated in",
                  value: stats.totalLeagues,
                  icon: "🎵",
                  stat: "totalLeagues",
                },
                {
                  label: "Completed Leagues",
                  info: "Number of leagues you have completed",
                  value: stats.completedLeagues,
                  icon: "✅",
                  stat: "completedLeagues",
                },
                {
                  label: "Avg Points/League",
                  info: "Average points scored across completed and ongoing league",
                  value:
                    stats.totalLeagues > 0
                      ? parseFloat(
                          (stats.totalPoints / stats.totalLeagues).toFixed(2)
                        )
                      : 0,
                  icon: "📊",
                  stat: "avgPoints",
                },
              ] satisfies Array<
                Omit<StatCardProps, "onClick" | "isExpanded"> & {
                  stat: typeof expandedStat;
                }
              >
            ).map((stat) => (
              <StatCard
                key={stat.label}
                {...stat}
                onClick={() => toggleStat(stat.stat)}
                isExpanded={expandedStat === stat.stat}
              />
            ))}
          </div>

          {expandedView && <div>{expandedView}</div>}
        </div>
      </div>
    </div>
  );
}

function GenericStatCard({ children, className, ...rest }: CardProps) {
  return (
    <Card
      {...rest}
      className={twMerge(
        "p-4 bg-linear-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg transition-all",
        className
      )}
    >
      {children}
    </Card>
  );
}

function LeaguesCards({
  leagues,
}: {
  leagues: Array<PopulatedLeague & { yourPoints: number }>;
}) {
  if (leagues.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {leagues.map((league) => {
          const dateString = (() => {
            if (league.status === "completed") {
              const sortedCompletedRounds = [...league.rounds.completed].sort(
                (a, b) => b.votingEndDate - a.votingEndDate
              );
              const lastRound =
                sortedCompletedRounds[sortedCompletedRounds.length - 1];
              if (lastRound) {
                return (
                  <span>
                    Completed on <DateTime>{lastRound.votingEndDate}</DateTime>
                  </span>
                );
              }
              return (
                <span>
                  Started on <DateTime>{league.leagueStartDate}</DateTime>
                </span>
              );
            }
            return (
              <span>
                Started on <DateTime>{league.leagueStartDate}</DateTime>
              </span>
            );
          })();

          return (
            <GenericStatCard key={league._id} className="p-0">
              <MaybeLink
                href={`/leagues/${league._id}`}
                className="block p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{league.title}</h3>
                    <p className="text-sm text-gray-600">
                      {league.numberOfRounds} rounds • {league.users.length}{" "}
                      participants • {league.yourPoints} points • {dateString}
                    </p>
                  </div>
                  <Pill className="capitalize" status={league.status}>
                    {league.status}
                  </Pill>
                </div>
              </MaybeLink>
            </GenericStatCard>
          );
        })}
      </div>
    </div>
  );
}

function SubmissionsCards({
  title,
  details,
}: {
  title: string;
  details: Array<{
    league: PopulatedLeague;
    submission: PopulatedSubmission;
    round: PopulatedRound;
    points: number;
  }>;
}) {
  const sortedDetails = useMemo(() => {
    return [...details].sort((a, b) => b.points - a.points);
  }, [details]);

  return (
    <GenericStatCard>
      <h3 className="font-semibold mb-3">{title}</h3>
      {sortedDetails.length === 0 ? (
        <div>No songs.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedDetails.map((detail) => (
            <div
              key={detail.submission._id}
              className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-white border border-gray-200 rounded"
            >
              <AlbumArt submission={detail.submission} round={detail.round} />
              <div className="sm:flex-1 min-w-0 text-center sm:text-left">
                <div className="font-medium truncate">
                  {detail.submission.trackInfo.title}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  by {detail.submission.trackInfo.artists.join(", ")}
                </div>
                <div className="text-xs text-gray-500">
                  <MaybeLink href={`/leagues/${detail.league._id}`}>
                    {detail.league.title}
                  </MaybeLink>{" "}
                  •{" "}
                  <MaybeLink
                    href={`/leagues/${detail.league._id}/rounds/${detail.round._id}`}
                  >
                    {detail.round.title}
                  </MaybeLink>{" "}
                  • Submitted on{" "}
                  <DateTime>{detail.submission.submissionDate}</DateTime>
                </div>
              </div>
              <div className="text-lg font-bold shrink-0">
                {detail.points} pts
              </div>
            </div>
          ))}
        </div>
      )}
    </GenericStatCard>
  );
}

function PlacementCard({
  user,
  placement,
  icon,
  leagues,
}: {
  user: PopulatedUser;
  placement: "1st" | "2nd" | "3rd";
  icon: string;
  leagues: Array<LeagueInfo>;
}) {
  return (
    <GenericStatCard>
      <h3 className="font-semibold mb-3">{placement} Place Finishes</h3>
      <div className="flex flex-col gap-2">
        {leagues.length === 0 ? (
          <div>
            {user.firstName} did not place {placement} in any leagues.
          </div>
        ) : (
          leagues.map((league) => (
            <MaybeLink
              key={league.leagueId}
              href={`/leagues/${league.leagueId}`}
              className="p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{icon}</span>
                <div>
                  <div className="font-medium">{league.leagueName}</div>
                  <div className="text-sm text-gray-600">
                    {league.points} points
                  </div>
                </div>
              </div>
            </MaybeLink>
          ))
        )}
      </div>
    </GenericStatCard>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  info: string;
  onClick: () => void;
  isExpanded?: boolean;
}
function StatCard({
  label,
  value,
  icon,
  info,
  onClick,
  isExpanded,
}: StatCardProps) {
  const isClickable = onClick !== undefined;

  return (
    <GenericStatCard
      title={info}
      element={HapticButton}
      onClick={onClick}
      className={twMerge(
        isClickable
          ? "cursor-pointer hover:shadow-md hover:border-purple-400"
          : "",
        isExpanded ? "ring-2 ring-purple-500 shadow-md" : ""
      )}
    >
      <div className="text-4xl mb-3 text-center">{icon}</div>
      <div className="text-2xl font-bold text-gray-800 text-center">
        {value}
      </div>
      <div className="text-xs text-gray-600 text-center">{label}</div>
    </GenericStatCard>
  );
}
