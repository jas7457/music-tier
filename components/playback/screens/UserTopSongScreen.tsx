"use client";

import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { SongScreen } from "./SongScreen";

export function UserTopSongScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  if (!playback.userTopSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">No submissions available</p>
      </div>
    );
  }

  const { trackInfo, points, user } = playback.userTopSong;

  return (
    <SongScreen
      isActive={isActive}
      title="People really dig this one"
      subtitle="Your Top Song"
      trackInfo={trackInfo}
      round={league.rounds.completed[0]}
      points={points}
      pointsStrokeColor={NEON_COLORS.Yellow}
      submittedBy={user}
    />
  );
}
