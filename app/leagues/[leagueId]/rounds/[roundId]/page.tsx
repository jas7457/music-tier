import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { getUser, getUserLeagues } from "@/lib/data";
import { RoundPageClient } from "./RoundPageClient";
import Card from "@/components/Card";

type PageProps = {
  params: { roundId: string; leagueId: string };
};

export default async function RoundPage({ params }: PageProps) {
  const { roundId, leagueId } = params;

  // Get session token from cookies
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) {
    redirect("/");
  }

  // Verify the session
  const payload = verifySessionToken(sessionToken);

  if (!payload) {
    redirect("/");
  }

  const [leagues, user] = await Promise.all([
    getUserLeagues(payload.userId),
    getUser(payload.userId),
  ]);
  const { league, round } = (() => {
    const empty = { league: null, round: null };

    const league = leagues.find((league) => league._id === leagueId);
    if (!league) {
      return empty;
    }

    const allRounds = [
      league.rounds.current,
      ...league.rounds.upcoming,
      ...league.rounds.completed,
    ].filter((round) => round !== undefined);

    if (roundId === "current") {
      const currentRound = allRounds.find(
        (round) => !["upcoming", "unknown", "completed"].includes(round.stage)
      );
      if (currentRound) {
        return { league, round: currentRound };
      }

      const now = Date.now();
      const closestRound = allRounds.sort((roundA, roundB) => {
        const distA = Math.abs(now - roundA.submissionStartDate);
        const distB = Math.abs(now - roundB.submissionStartDate);
        return distA - distB;
      })[0];

      if (closestRound) {
        return { league, round: closestRound };
      }

      return empty;
    }

    for (const round of allRounds) {
      if (round._id === roundId) {
        return { league, round };
      }
    }
    return empty;
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
