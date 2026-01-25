'use client';

import { Screen } from '../components/Screen';
import { NEON_COLORS } from '../constants';
import type { PlaybackScreenProps } from '../types';
import { UserStatScreen } from './UserStatScreen';

export function BiggestFanScreen({ playback, isActive }: PlaybackScreenProps) {
  const biggestFan = playback.biggestFan;

  return (
    <Screen>
      <UserStatScreen
        background={{ from: '#f59e0b', via: '#ef4444', to: '#d946ef' }}
        isActive={isActive}
        kicker="You two must really like each other"
        title="Your Biggest Fan"
        user={biggestFan?.user || null}
        color={NEON_COLORS.LimeGreen}
        stat={{
          value: biggestFan ? `${biggestFan.points} points` : '',
          label: 'gave you',
          songs:
            biggestFan?.songs.map((song) => ({
              ...song,
              rightText: `+${song.points} pts`,
            })) || [],
        }}
        noDataMessage="No fan data available"
      />
    </Screen>
  );
}
