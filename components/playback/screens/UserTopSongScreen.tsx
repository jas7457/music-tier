"use client";

import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { SongScreen } from "./SongScreen";

export function UserTopSongScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  const userTopSong = playback.userTopSong;

  if (!userTopSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">No submissions available</p>
      </div>
    );
  }

  const { trackInfo, points } = userTopSong;

  return (
    <SongScreen
      isActive={isActive}
      title="People really dig this one"
      subtitle="Your Top Song"
      pointsStrokeColor={NEON_COLORS.Yellow}
      trackInfo={trackInfo}
      round={league.rounds.completed[0]}
      points={points}
    />
  );
}
