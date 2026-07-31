'use client';

import { League } from '@/components/League';
import { PopulatedLeague, PopulatedUser } from '@/lib/types';
import { useRealTimeUpdates } from '@/lib/PusherContext';
import { Breadcrumb, HomeIcon, LeagueIcon } from '@/components/Breadcrumb';

type LeaguePageClientProps = {
  league: PopulatedLeague;
  user: PopulatedUser;
};

export function LeaguePageClient({ league, user }: LeaguePageClientProps) {
  useRealTimeUpdates();

  return (
    <div className="max-w-4xl mx-auto">
      <Breadcrumb
        items={[
          { label: '', icon: <HomeIcon />, href: '/' },
          { label: league.title, icon: <LeagueIcon /> },
        ]}
      />
      <div className="w98-sunken p-2 md:p-3">
        <League league={league} user={user} />
      </div>
    </div>
  );
}
