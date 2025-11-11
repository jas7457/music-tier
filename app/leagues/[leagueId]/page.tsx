import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { getUserLeagues } from "@/lib/data";
import { LeaguePageClient } from "./LeaguePageClient";
import Card from "@/components/Card";

type PageProps = {
  params: { leagueId: string };
};

export default async function LeaguePage({ params }: PageProps) {
  const { leagueId } = params;

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

  const leagues = await getUserLeagues(payload.userId);
  const league = (() => {
    if (leagueId === "current") {
      const current = leagues.find((league) => league.status === "active");
      if (current) {
        return current;
      }

      const now = Date.now();
      const other = leagues
        .filter((league) => league.status !== "active")
        .sort((leagueA, leagueB) => {
          const distanceFromA = Math.abs(now - leagueA.leagueStartDate);
          const distanceFromB = Math.abs(now - leagueB.leagueStartDate);
          return distanceFromA - distanceFromB;
        });

      return other[0];
    }
    return leagues.find((league) => league._id.toString() === leagueId);
  })();

  if (!league) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">League not found</h2>
          <p className="text-gray-600">
            This league doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </Card>
      </div>
    );
  }

  return <LeaguePageClient league={league} />;
}
