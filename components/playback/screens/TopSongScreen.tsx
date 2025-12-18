"use client";

import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { SongScreen } from "./SongScreen";
import { Screen } from "../components/Screen";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";

export function TopSongScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  if (!playback.topSong) {
    return (
      <Screen>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No song data available</p>
        </div>
      </Screen>
    );
  }

  const { trackInfo, points, user, votes } = playback.topSong;

  const voters = votes.map((vote) => ({
    user: vote.userObject!,
    rightText: `+${vote.points} pts`,
    note: vote.note,
  }));

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatedImageBackdrop imageUrl={trackInfo.albumImageUrl} />
      <SongScreen
        isActive={isActive}
        title="Fan Favorite"
        subtitle="Song with Most Points"
        trackInfo={trackInfo}
        round={league.rounds.completed[0]}
        points={points}
        submittedBy={user}
        pointsStrokeColor={NEON_COLORS.ElectricPurple}
        voters={voters}
      />
    </div>
  );
}
