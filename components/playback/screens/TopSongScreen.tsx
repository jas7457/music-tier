"use client";

import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { SongScreen } from "./SongScreen";

export function TopSongScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  if (!playback.topSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">No song data available</p>
      </div>
    );
  }

  const { trackInfo, points, user } = playback.topSong;

  return (
    <SongScreen
      isActive={isActive}
      title="Fan Favorite"
      subtitle="Song with Most Points"
      trackInfo={trackInfo}
      round={league.rounds.completed[0]}
      points={points}
      submittedBy={user}
      pointsStrokeColor={NEON_COLORS.ElectricPurple}
    />
  );
}
