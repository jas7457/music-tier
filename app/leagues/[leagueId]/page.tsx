import { redirect } from 'next/navigation';
import {
  getLeagueById,
  getLeagueSummaries,
  getUserByCookies,
} from '@/lib/data';
import { getPolls } from '@/lib/polls';
import Card from '@/components/Card';
import { verifySessionToken } from '@/lib/auth';
import { Venue } from '@/components/venue/Venue';

type PageProps = {
  params: Promise<{ leagueId: string }>;
};

export default async function LeaguePage(props: PageProps) {
  const params = await props.params;
  const { leagueId } = params;

  // Verify the session
  const payload = await verifySessionToken();
  if (!payload) {
    redirect('/');
  }

  const [league, otherLeagues, { polls }] = await Promise.all([
    getLeagueById(leagueId, payload.userId),
    getLeagueSummaries(payload.userId),
    getPolls(payload.userId),
  ]);
  const user =
    league?.users.find((member) => member._id === payload.userId) ??
    (await getUserByCookies(league ? league._id : leagueId));

  if (!league || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">League not found</h2>
          <p className="text-ink-muted">
            This league doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <Venue
      key={league._id}
      league={league}
      user={user}
      otherLeagues={otherLeagues}
      polls={polls}
    />
  );
}
