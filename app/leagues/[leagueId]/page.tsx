import { redirect } from "next/navigation";
import { getLeagueById, getUserByCookies } from "@/lib/data";
import { LeaguePageClient } from "./LeaguePageClient";
import Card from "@/components/Card";
import { verifySessionToken } from "@/lib/auth";

type PageProps = {
  params: { leagueId: string };
};

export default async function LeaguePage({ params }: PageProps) {
  const { leagueId } = params;

  // Verify the session
  const payload = verifySessionToken();
  if (!payload) {
    redirect("/");
  }

  const league = await getLeagueById(leagueId, payload.userId);
  const user = await getUserByCookies(league ? league._id : leagueId);

  if (!league || !user) {
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

  return <LeaguePageClient league={league} user={user} />;
}
