"use client";

import { useRouter } from "next/navigation";
import { Round } from "@/components/Round";
import Card from "@/components/Card";
import { PopulatedRound, PopulatedUser, PopulatedLeague } from "@/lib/types";

type RoundPageClientProps = {
  round: PopulatedRound;
  league: Pick<
    PopulatedLeague,
    "daysForSubmission" | "daysForVoting" | "users" | "votesPerRound" | "_id"
  >;
  currentUser: PopulatedUser;
};

export function RoundPageClient({
  round,
  league,
  currentUser,
}: RoundPageClientProps) {
  const router = useRouter();

  const handleDataSaved = () => {
    // Refresh the page to get updated data from the server
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="p-6">
          <Round
            currentUser={currentUser}
            round={round}
            league={league}
            onDataSaved={handleDataSaved}
          />
        </Card>
      </div>
    </div>
  );
}
