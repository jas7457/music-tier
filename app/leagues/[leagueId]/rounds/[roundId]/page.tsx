import { redirect } from 'next/navigation';
import { getLeagueById, getLeagueSummaries, getUser } from '@/lib/data';
import { getPolls } from '@/lib/polls';
import { Venue } from '@/components/venue/Venue';
import type { StationId } from '@/components/venue/stations';
import Card from '@/components/Card';
import { getAllRounds } from '@/lib/utils/getAllRounds';
import { verifySessionToken } from '@/lib/auth';

type PageProps = {
  params: Promise<{ roundId: string; leagueId: string }>;
};

export default async function RoundPage(props: PageProps) {
  const params = await props.params;
  const { roundId, leagueId } = params;

  // Verify the session
  const payload = await verifySessionToken();
  if (!payload) {
    redirect('/');
  }

  const [user, league, otherLeagues, { polls }] = await Promise.all([
    getUser(payload.userId, 'any'),
    getLeagueById(leagueId, payload.userId),
    getLeagueSummaries(payload.userId),
    getPolls(payload.userId),
  ]);

  const round = (() => {
    if (!league) {
      return;
    }

    const allRounds = getAllRounds(league);
    if (roundId === 'current') {
      const currentRound = allRounds.find(
        (round) => !['upcoming', 'unknown', 'completed'].includes(round.stage),
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Round not found</h2>
          <p className="text-ink-muted">
            This round doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </Card>
      </div>
    );
  }

  // Links to a round (notifications, shared URLs) open the venue at the
  // station where that round needs you.
  const isCurrent = league.rounds.current?._id === round._id;
  const initialStation: StationId = (() => {
    if (!isCurrent) {
      return 'crates';
    }
    switch (round.stage) {
      case 'submission':
        return 'booth';
      case 'voting':
      case 'currentUserVotingCompleted':
        return 'ballot';
      default:
        return 'crates';
    }
  })();
  const me = league.users.find(
    (member) => member._id === user._id.toString(),
  ) ?? { ...user, _id: user._id.toString(), index: 0 };

  return (
    <Venue
      key={league._id}
      league={league}
      user={me}
      otherLeagues={otherLeagues}
      polls={polls}
      initialStation={initialStation}
      initialRoundId={initialStation === 'crates' ? round._id : null}
    />
  );
}
