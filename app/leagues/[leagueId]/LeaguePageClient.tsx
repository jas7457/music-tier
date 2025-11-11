"use client";

import { useRouter } from "next/navigation";
import { League } from "@/components/League";
import Card from "@/components/Card";
import { PopulatedLeague } from "@/lib/types";
import { useCallback } from "react";
import { useRealTimeUpdates } from "@/lib/PusherContext";

type LeaguePageClientProps = {
  league: PopulatedLeague;
};

export function LeaguePageClient({ league }: LeaguePageClientProps) {
  const router = useRouter();

  const handleDataSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  useRealTimeUpdates(handleDataSaved);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="p-6">
          <League league={league} onDataSaved={handleDataSaved} />
        </Card>
      </div>
    </div>
  );
}
