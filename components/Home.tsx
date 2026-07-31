'use client';

import { PopulatedLeague, PopulatedUser } from '@/lib/types';
import { League } from './League';
import { useRealTimeUpdates } from '@/lib/PusherContext';
import { useEffect, useState } from 'react';
import { Expandable } from './Expandable';
import { SearchBar } from './SearchBar';
import { GroupBox } from './win98/Controls';
import { FolderIcon, FolderOpenIcon } from './win98/Icons';

export default function Home({
  leagues,
  user,
}: {
  leagues: PopulatedLeague[];
  user: PopulatedUser;
}) {
  const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(
    new Set(leagues.length > 0 ? [leagues[0]._id] : []),
  );

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  useRealTimeUpdates();

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

  const toggleLeague = (leagueId: string) => {
    setExpandedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(leagueId)) {
        next.delete(leagueId);
      } else {
        next.add(leagueId);
      }
      return next;
    });
  };

  const leagueMarkup = (() => {
    if (leagues.length === 0) {
      return (
        <div className="w98-paper p-8 text-center">
          <div className="mx-auto mb-3 w-8">
            <FolderIcon size={32} />
          </div>
          <h2 className="text-lg mb-1">This folder is empty</h2>
          <p className="max-w-sm mx-auto text-sm">
            You&apos;re not part of any leagues yet. Create or join one to get
            started!
          </p>
        </div>
      );
    }

    const nonFirstLeagues = leagues.slice(1);

    const { upcomingLeagues, completedLeagues, otherLeagues } =
      nonFirstLeagues.reduce(
        (acc, league) => {
          if (league.leagueStartDate > now) {
            acc.upcomingLeagues.push(league);
          } else if (league.status === 'completed') {
            acc.completedLeagues.push(league);
          } else {
            acc.otherLeagues.push(league);
          }
          return acc;
        },
        {
          upcomingLeagues: [] as PopulatedLeague[],
          completedLeagues: [] as PopulatedLeague[],
          otherLeagues: [] as PopulatedLeague[],
        },
      );

    const getOtherLeaguesMarkup = ({
      leagues,
      title,
    }: {
      leagues: PopulatedLeague[];
      title: string;
    }) => {
      if (leagues.length === 0) {
        return null;
      }

      return (
        <GroupBox label={title}>
          <div className="grid grid-cols-1 gap-1.5">
            {leagues.map((league) => {
              const isExpanded = expandedLeagues.has(league._id);

              return (
                <div key={league._id.toString()} className="w98-raised-thin">
                  {/* A tree node: the +/- box, the folder, the label. */}
                  <button
                    onClick={() => toggleLeague(league._id)}
                    className="w-full px-2 py-1.5 flex items-center gap-2 text-left hover:bg-w98-face"
                  >
                    <span className="flex-none w-3.5 h-3.5 flex items-center justify-center border border-w98-shadow bg-white text-black text-xs leading-none font-bold">
                      {isExpanded ? '−' : '+'}
                    </span>
                    {isExpanded ? <FolderOpenIcon /> : <FolderIcon />}
                    <span className="font-bold">{league.title}</span>
                    <span className="text-sm">
                      ({league.users.length} members)
                    </span>
                  </button>

                  <Expandable className="p-2" isExpanded={isExpanded}>
                    <League league={league} user={user} />
                  </Expandable>
                </div>
              );
            })}
          </div>
        </GroupBox>
      );
    };

    return (
      <div className="space-y-4">
        {/* Current League */}
        {leagues.length > 0 && (
          <GroupBox label="Current League">
            <League league={leagues[0]} user={user} />
          </GroupBox>
        )}

        {/* Upcoming Leagues */}
        {getOtherLeaguesMarkup({
          leagues: upcomingLeagues,
          title: 'Upcoming Leagues',
        })}

        {/* Completed Leagues */}
        {getOtherLeaguesMarkup({
          leagues: completedLeagues,
          title: 'Completed Leagues',
        })}

        {/* Other Leagues */}
        {getOtherLeaguesMarkup({
          leagues: otherLeagues,
          title: 'Other Leagues',
        })}
      </div>
    );
  })();

  return (
    <div className="max-w-5xl mx-auto">
      <SearchBar leagues={leagues} />
      <div className="w98-separator" />
      {leagueMarkup}
    </div>
  );
}
