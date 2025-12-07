import { redirect } from "next/navigation";
import { getLeagueById, getUser } from "@/lib/data";
import { RoundPageClient } from "./RoundPageClient";
import Card from "@/components/Card";
import { getAllRounds } from "@/lib/utils/getAllRounds";
import { verifySessionToken } from "@/lib/auth";

type PageProps = {
  params: Promise<{ roundId: string; leagueId: string }>;
};

export default async function RoundPage(props: PageProps) {
  const params = await props.params;
  const { roundId, leagueId } = params;

  // Verify the session
  const payload = await verifySessionToken();
  if (!payload) {
    redirect("/");
  }

  const [user, league] = await Promise.all([
    getUser(payload.userId, leagueId),
    getLeagueById(leagueId, payload.userId),
  ]);

  const round = (() => {
    if (!league) {
      return;
    }

    const allRounds = getAllRounds(league, { includePending: true });
    if (roundId === "current") {
      const currentRound = allRounds.find(
        (round) => !["upcoming", "unknown", "completed"].includes(round.stage)
      );
      if (currentRound) {
        return currentRound;
      }

      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      const closestRound = allRounds.sort((roundA, roundB) => {
        const distA = Math.abs(now - roundA.submissionStartDate);
        const distB = Math.abs(now - roundB.submissionStartDate);
        return distA - distB;
      })[0];

      if (closestRound) {
        return closestRound;
      }

      return;
    }

    for (const round of allRounds) {
      if (round._id === roundId) {
        return round;
      }
    }
    return undefined;
  })();

  if (!league || !round || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Round not found</h2>
          <p className="text-gray-600">
            This round doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <RoundPageClient
      round={round}
      league={league}
      currentUser={{ ...user, _id: user._id.toString(), index: 0 }}
    />
  );
}
