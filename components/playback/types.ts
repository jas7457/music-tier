import type { PopulatedLeague, LeaguePlaybackStats } from '@/lib/types';

export interface PlaybackScreenProps {
  playback: LeaguePlaybackStats;
  league: PopulatedLeague;
  currentUserId: string;
  isActive: boolean;
  isExiting: boolean;
}

export interface PlaybackScreen {
  key: string;
  component: React.ComponentType<PlaybackScreenProps>;
  viewType:
    | 'IntroScreen'
    | 'SummaryScreen'
    | 'SongScreen'
    | 'UserScreen'
    | 'CustomScreen';
}
