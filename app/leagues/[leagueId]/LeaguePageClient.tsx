"use client";

import { League } from "@/components/League";
import Card from "@/components/Card";
import { PopulatedLeague } from "@/lib/types";
import { useRealTimeUpdates } from "@/lib/PusherContext";

type LeaguePageClientProps = {
  league: PopulatedLeague;
};

export function LeaguePageClient({ league }: LeaguePageClientProps) {
  useRealTimeUpdates();

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="p-6">
          <League league={league} />
        </Card>
      </div>
    </div>
  );
}
