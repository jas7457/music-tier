"use client";

import { Round } from "@/components/Round";
import Card from "@/components/Card";
import { PopulatedRound, PopulatedUser, PopulatedLeague } from "@/lib/types";
import { useRealTimeUpdates } from "@/lib/PusherContext";

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
  useRealTimeUpdates(round);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="p-6">
          <Round
            key={round.stage}
            currentUser={currentUser}
            round={round}
            league={league}
          />
        </Card>
      </div>
    </div>
  );
}
