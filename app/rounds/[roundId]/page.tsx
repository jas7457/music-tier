import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { getUser, getUserLeagues } from "@/lib/data";
import { RoundPageClient } from "./RoundPageClient";
import Card from "@/components/Card";

type PageProps = {
  params: { roundId: string };
};

export default async function RoundPage({ params }: PageProps) {
  const { roundId } = params;

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
    for (const league of leagues) {
      const allRounds = [
        league.rounds.current,
        ...league.rounds.upcoming,
        ...league.rounds.completed,
      ];
      for (const round of allRounds) {
        if (round && round._id === roundId) {
          return { league, round };
        }
      }
    }
    return { league: null, round: null };
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
