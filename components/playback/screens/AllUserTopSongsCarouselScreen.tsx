"use client";

import { Screen } from "../components/Screen";
import type { PlaybackScreenProps } from "../types";
import { SongScreen } from "./SongScreen";
import { NEON_COLORS } from "../constants";
import { HorizontalCarousel } from "../components/HorizontalCarousel";

export function AllUserTopSongsCarouselScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const songs = playback.allUserTopSongs;

  if (!songs || songs.length === 0) {
    return (
      <Screen background={{ from: "#f97316", via: "#ec4899", to: "#8b5cf6" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No song data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#f97316", via: "#ec4899", to: "#8b5cf6" }}>
      <HorizontalCarousel
        items={songs}
        isActive={isActive}
        renderItem={(song, index, isItemActive) => (
          <SongScreen
            isActive={isActive && isItemActive}
            title={`#${index + 1} Top Song`}
            subtitle={`${song.user.firstName} ${song.user.lastName}'s Best`}
            trackInfo={song.trackInfo}
            round={song.round}
            points={song.points}
            pointsStrokeColor={NEON_COLORS.BrightPink}
            submittedBy={song.user}
          />
        )}
      />
    </Screen>
  );
}
