"use client";

import { Round } from "@/components/Round";
import Card from "@/components/Card";
import { PopulatedRound, PopulatedUser, PopulatedLeague } from "@/lib/types";
import { useRealTimeUpdates } from "@/lib/PusherContext";
import {
  Breadcrumb,
  HomeIcon,
  LeagueIcon,
  RoundIcon,
} from "@/components/Breadcrumb";
import { getRoundTitle } from "@/lib/utils/getRoundTitle";

type RoundPageClientProps = {
  round: PopulatedRound;
  league: PopulatedLeague;
  currentUser: PopulatedUser;
};

export function RoundPageClient({
  round,
  league,
  currentUser,
}: RoundPageClientProps) {
  useRealTimeUpdates(league);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb
          items={[
            { label: "", icon: <HomeIcon />, href: "/" },
            {
              label: league.title,
              icon: <LeagueIcon />,
              href: `/leagues/${league._id}`,
            },
            {
              label: getRoundTitle(round),
              icon: <RoundIcon />,
            },
          ]}
        />
        <Card className="p-2 md:p-6">
          <Round currentUser={currentUser} round={round} league={league} />
        </Card>
      </div>
    </div>
  );
}
