'use client';

import Link from '@/components/AppLink';
import Card from './Card';
import { PopulatedLeague, PopulatedUser } from '@/lib/types';
import type { LeagueSummary } from '@/lib/data';
import { League } from './League';
import { useRealTimeUpdates } from '@/lib/PusherContext';
import { useEffect } from 'react';
import { getLeaguesRefreshBoundaries } from '@/lib/utils/getRefreshBoundaries';
import { formatDate } from '@/lib/utils/formatDate';

export default function Home({
  currentLeague,
  otherLeagues,
  user,
}: {
  currentLeague: PopulatedLeague | undefined;
  otherLeagues: LeagueSummary[];
  user: PopulatedUser;
}) {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  useRealTimeUpdates(
    getLeaguesRefreshBoundaries(currentLeague ? [currentLeague] : []),
  );

  useEffect(() => {
    if (!('Notification' in window)) {
      return;
    }

    if (
      Notification.permission === 'denied' ||
      Notification.permission === 'granted'
    ) {
      return;
    }

    const requestPermission = () => {
      Notification.requestPermission();
    };

    document.addEventListener('click', requestPermission, { once: true });
    return () => {
      document.removeEventListener('click', requestPermission);
    };
  }, []);

  if (!user) {
    return <div>No user data...</div>;
  }

  const leagueMarkup = (() => {
    if (!currentLeague) {
      return (
        <Card className="p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-lightest text-2xl">
            🎧
          </div>
          <h2 className="text-xl font-semibold mb-2">No Leagues Yet</h2>
          <p className="text-ink-muted max-w-sm mx-auto">
            You&apos;re not part of any leagues yet. Create or join one to get
            started!
          </p>
        </Card>
      );
    }

    const upcomingLeagues = otherLeagues.filter(
      (league) => league.leagueStartDate > now,
    );
    const pastLeagues = otherLeagues.filter(
      (league) => league.leagueStartDate <= now,
    );

    const getOtherLeaguesMarkup = ({
      leagues,
      title,
    }: {
      leagues: LeagueSummary[];
      title: string;
    }) => {
      if (leagues.length === 0) {
        return null;
      }

      return (
        <div>
          <h2 className="text-xs font-semibold mb-3 text-ink-subtle uppercase tracking-widest">
            {title}
          </h2>
          <Card variant="elevated" className="overflow-hidden">
            <ul className="divide-y divide-ink/8">
              {leagues.map((league) => (
                <li key={league._id}>
                  <Link
                    href={`/leagues/${league._id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-5 hover:bg-white/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-ink truncate">
                        {league.title}
                      </div>
                      <div className="text-sm text-ink-subtle">
                        {league.leagueStartDate > now ? 'Starts' : 'Started'}{' '}
                        {formatDate(league.leagueStartDate, {
                          year: 'numeric',
                        })}{' '}
                        · {league.memberCount}{' '}
                        {league.memberCount === 1 ? 'member' : 'members'}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 shrink-0 text-ink-subtle"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      );
    };

    return (
      <div className="space-y-8">
        {/* Current League */}
        <div>
          <h2 className="text-xs font-semibold mb-3 text-ink-subtle uppercase tracking-widest">
            Current League
          </h2>
          <Card variant="elevated">
            <div className="p-3 md:p-6">
              <League league={currentLeague} user={user} />
            </div>
          </Card>
        </div>

        {getOtherLeaguesMarkup({
          leagues: upcomingLeagues,
          title: 'Upcoming Leagues',
        })}

        {getOtherLeaguesMarkup({
          leagues: pastLeagues,
          title: 'Past Leagues',
        })}
      </div>
    );
  })();

  return (
    <div className="max-w-4xl mx-auto">
      {leagueMarkup}
    </div>
  );
}
