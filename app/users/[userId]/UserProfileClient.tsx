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
import { useAuth } from "@/lib/AuthContext";

type LeagueInfo = PopulatedLeague & {
  yourPoints: number;
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
  const { user: youUser } = useAuth();
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

  const isYou = user._id === youUser?._id;
  const infoMap = useMemo(() => {
    const person = isYou ? "you" : user.firstName;

    return {
      totalPoints: "Total points across all completed and ongoing leagues",
      firstPlace: `Number of completed leagues where ${person} placed 1st`,
      secondPlace: `Number of completed leagues where ${person} placed 2nd`,
      thirdPlace: `Number of completed leagues where ${person} placed 3rd`,
      mostVoted: `Number of ${
        isYou ? "your" : `${person}'s`
      } submissions that received the most points in their rounds`,
      totalLeagues: `Total number of completed and ongoing leagues you have participated in`,
      completedLeagues: `Number of leagues ${
        isYou ? "you have" : `${person} has`
      } completed`,
      avgPoints: `Average points scored across completed and ongoing league`,
    };
  }, [isYou, user.firstName]);

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
            info={infoMap.totalPoints}
            details={stats.totalPointsDetails}
          />
        );
      }
      case "firstPlace": {
        return (
          <LeaguesCards
            title="1st Place Wins"
            icon="🥇"
            info={infoMap.firstPlace}
            leagues={stats.firstPlaceLeagues}
          />
        );
      }
      case "secondPlace": {
        return (
          <LeaguesCards
            title="2nd Place Wins"
            icon="🥈"
            info={infoMap.secondPlace}
            leagues={stats.secondPlaceLeagues}
          />
        );
      }
      case "thirdPlace": {
        return (
          <LeaguesCards
            title="3rd Place Wins"
            icon="🥉"
            info={infoMap.thirdPlace}
            leagues={stats.thirdPlaceLeagues}
          />
        );
      }
      case "mostVoted": {
        return (
          <SubmissionsCards
            title="Most Voted Songs"
            info={infoMap.mostVoted}
            details={stats.mostVotedSongDetails}
          />
        );
      }
      case "totalLeagues": {
        return (
          <LeaguesCards
            title="Total Leagues"
            info={infoMap.totalLeagues}
            leagues={[...currentLeagues, ...pastLeagues]}
          />
        );
      }
      case "completedLeagues": {
        return (
          <LeaguesCards
            title="Completed Leagues"
            info={infoMap.completedLeagues}
            leagues={pastLeagues.filter(
              (league) => league.status === "completed"
            )}
          />
        );
      }
      case "avgPoints": {
        return (
          <GenericStatCard className="flex flex-col gap-2" color="gray">
            <div>
              <h3 className="font-semibold">Points Per League</h3>
              <div className="text-xs text-gray-500">{infoMap.avgPoints}</div>
            </div>

            {stats.pointsPerLeague.length === 0 ? (
              <div>
                {isYou ? "You have" : `${user.firstName} has`} no points in any
                leagues yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.pointsPerLeague
                  .sort((a, b) => b.points - a.points)
                  .map((league) => (
                    <GenericStatCard
                      key={league.league._id}
                      color="white"
                      className="p-0 overflow-clip"
                    >
                      <MaybeLink
                        key={league.league._id}
                        href={`/leagues/${league.league._id}`}
                        className="block p-4 bg-white transition-colors"
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
                    </GenericStatCard>
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
  }, [
    expandedStat,
    infoMap.totalPoints,
    infoMap.firstPlace,
    infoMap.secondPlace,
    infoMap.thirdPlace,
    infoMap.mostVoted,
    infoMap.totalLeagues,
    infoMap.completedLeagues,
    infoMap.avgPoints,
    stats.totalPointsDetails,
    stats.firstPlaceLeagues,
    stats.secondPlaceLeagues,
    stats.thirdPlaceLeagues,
    stats.mostVotedSongDetails,
    stats.pointsPerLeague,
    user,
    currentLeagues,
    pastLeagues,
    isYou,
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* User Header */}
      <div className="border-b border-gray-300 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <Avatar
            user={user}
            size={20}
            className="text-3xl"
            includeLink={false}
          />
          <div>
            <h1 className="text-3xl font-bold">{fullName}</h1>
            <p className="text-gray-600">{user.userName}</p>
            <p className="text-sm text-gray-500">
              <DateTime prefix="Joined">{user.signupDate}</DateTime>
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
                  info: infoMap.totalPoints,
                  icon: "🏆",
                  stat: "totalPoints",
                },
                {
                  label: "1st Place",
                  value: stats.firstPlaceLeagues.length,
                  info: infoMap.firstPlace,
                  icon: "🥇",
                  stat: "firstPlace",
                },
                {
                  label: "2nd Place",
                  info: infoMap.secondPlace,
                  value: stats.secondPlaceLeagues.length,
                  icon: "🥈",
                  stat: "secondPlace",
                },
                {
                  label: "3rd Place",
                  info: infoMap.thirdPlace,
                  value: stats.thirdPlaceLeagues.length,
                  icon: "🥉",
                  stat: "thirdPlace",
                },
                {
                  label: "Most Voted Songs",
                  info: infoMap.mostVoted,
                  value: stats.mostVotedSongDetails.length,
                  icon: "⭐",
                  stat: "mostVoted",
                },
                {
                  label: "Total Leagues",
                  info: infoMap.totalLeagues,
                  value: stats.totalLeagues,
                  icon: "🎵",
                  stat: "totalLeagues",
                },
                {
                  label: "Completed Leagues",
                  info: infoMap.completedLeagues,
                  value: stats.completedLeagues,
                  icon: "✅",
                  stat: "completedLeagues",
                },
                {
                  label: "Avg Points/League",
                  info: infoMap.avgPoints,
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

function GenericStatCard({
  children,
  className,
  color,
  ...rest
}: CardProps & { color: "white" | "gray" }) {
  return (
    <Card
      {...rest}
      className={twMerge(
        "p-4 border-gray-200 rounded-lg transition-all",
        color === "white"
          ? "bg-white"
          : "bg-linear-to-br from-gray-50 to-gray-100 border-2",
        className
      )}
    >
      {children}
    </Card>
  );
}

function LeaguesCards({
  title,
  info,
  leagues,
  icon,
}: {
  title: string;
  info: string;
  leagues: Array<PopulatedLeague & { yourPoints: number }>;
  icon?: string;
}) {
  return (
    <GenericStatCard className="flex flex-col gap-2" color="gray">
      <div className="flex items-center gap-2">
        {icon && <div className="text-3xl">{icon}</div>}

        <div>
          <h3 className="font-semibold">{title}</h3>
          <div className="text-xs text-gray-500">{info}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {leagues.length === 0 ? (
          <div>No leagues.</div>
        ) : (
          leagues.map((league) => {
            const dateString = (() => {
              if (league.status === "completed") {
                const sortedCompletedRounds = [...league.rounds.completed].sort(
                  (a, b) => b.votingEndDate - a.votingEndDate
                );
                const lastRound =
                  sortedCompletedRounds[sortedCompletedRounds.length - 1];
                if (lastRound) {
                  return (
                    <DateTime prefix="Completed on">
                      {lastRound.votingEndDate}
                    </DateTime>
                  );
                }
                return (
                  <DateTime prefix="Started on">
                    {league.leagueStartDate}
                  </DateTime>
                );
              }
              return (
                <DateTime prefix="Started on">
                  {league.leagueStartDate}
                </DateTime>
              );
            })();

            return (
              <GenericStatCard
                key={league._id}
                className="p-0 overflow-clip"
                color="white"
              >
                <MaybeLink
                  href={`/leagues/${league._id}`}
                  className="block p-4 bg-white transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{league.title}</h3>
                      <p className="text-sm text-gray-600">
                        {league.yourPoints} points • {league.numberOfRounds}{" "}
                        rounds • {league.users.length} participants •{" "}
                        {dateString}
                      </p>
                    </div>
                    <Pill className="capitalize" status={league.status}>
                      {league.status}
                    </Pill>
                  </div>
                </MaybeLink>
              </GenericStatCard>
            );
          })
        )}
      </div>
    </GenericStatCard>
  );
}

function SubmissionsCards({
  title,
  info,
  details,
}: {
  title: string;
  info: string;
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
    <GenericStatCard color="gray" className="flex flex-col gap-2">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <div className="text-xs text-gray-500">{info}</div>
      </div>
      {sortedDetails.length === 0 ? (
        <div>No songs.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedDetails.map((detail) => (
            <GenericStatCard
              key={detail.submission._id}
              color="white"
              className="flex flex-col sm:flex-row items-center gap-3"
            >
              <AlbumArt
                trackInfo={detail.submission.trackInfo}
                round={detail.round}
              />
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
                  •{" "}
                  <DateTime prefix="Submitted on">
                    {detail.submission.submissionDate}
                  </DateTime>
                </div>
              </div>
              <div className="text-lg font-bold shrink-0">
                {detail.points} pts
              </div>
            </GenericStatCard>
          ))}
        </div>
      )}
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
      color="gray"
      className={twMerge(
        isClickable
          ? "cursor-pointer hover:shadow-md hover:border-primary"
          : "",
        isExpanded ? "ring-2 ring-primary shadow-md" : ""
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
