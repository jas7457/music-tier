import type { PopulatedLeague, LeaguePlaybackStats } from "@/lib/types";
import type { TrackInfo } from "@/databaseTypes";

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
  trackInfo?: (
    playback: LeaguePlaybackStats,
    currentUserId?: string
  ) => TrackInfo | null;
  background: {
    from: string;
    via: string;
    to: string;
  };
}
