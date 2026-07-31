'use client';

import { Round } from '@/components/Round';
import { PopulatedRound, PopulatedUser, PopulatedLeague } from '@/lib/types';
import { useRealTimeUpdates } from '@/lib/PusherContext';
import {
  Breadcrumb,
  HomeIcon,
  LeagueIcon,
  RoundIcon,
} from '@/components/Breadcrumb';
import { getRoundTitle } from '@/lib/utils/getRoundTitle';

type RoundPageClientProps = {
  round: PopulatedRound;
  league: PopulatedLeague;
  currentUser: PopulatedUser;
};

export function RoundPageClient({
  round,
  league,
  currentUser,
}: RoundPageClientProps) {
  useRealTimeUpdates();

  return (
    <div className="max-w-4xl mx-auto">
      <Breadcrumb
        items={[
          { label: '', icon: <HomeIcon />, href: '/' },
          {
            label: league.title,
            icon: <LeagueIcon />,
            href: `/leagues/${league._id}`,
          },
          {
            label: getRoundTitle(round),
            icon: <RoundIcon />,
          },
        ]}
      />
      <div className="w98-sunken p-2 md:p-3">
        <Round
          key={round.stage}
          currentUser={currentUser}
          round={round}
          league={league}
          isRoundPage={true}
        />
      </div>
    </div>
  );
}
