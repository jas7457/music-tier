"use client";

import { League } from "@/components/League";
import Card from "@/components/Card";
import { PopulatedLeague, PopulatedUser } from "@/lib/types";
import { useRealTimeUpdates } from "@/lib/PusherContext";
import { Breadcrumb, HomeIcon, LeagueIcon } from "@/components/Breadcrumb";

type LeaguePageClientProps = {
  league: PopulatedLeague;
  user: PopulatedUser;
};

export function LeaguePageClient({ league, user }: LeaguePageClientProps) {
  useRealTimeUpdates();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb
          items={[
            { label: "", icon: <HomeIcon />, href: "/" },
            { label: league.title, icon: <LeagueIcon /> },
          ]}
        />
        <Card className="p-2 md:p-6">
          <League league={league} user={user} />
        </Card>
      </div>
    </div>
  );
}
