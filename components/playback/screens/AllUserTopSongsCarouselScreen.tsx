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
          <>
            {/* Celebration elements for top 3 songs */}
            {index === 0 && isItemActive && isActive && (
              <>
                {/* Floating stars around the screen */}
                <div
                  className="absolute top-[15%] left-[12%] text-5xl opacity-40 z-0"
                  style={{
                    animation: "star-twirl 4s ease-in-out infinite",
                  }}
                >
                  ⭐
                </div>
                <div
                  className="absolute top-[20%] right-[15%] text-4xl opacity-50 z-0"
                  style={{
                    animation: "star-twirl 3.5s ease-in-out 0.5s infinite",
                  }}
                >
                  ⭐
                </div>
                <div
                  className="absolute bottom-[25%] left-[10%] text-6xl opacity-35 z-0"
                  style={{
                    animation: "star-twirl 4.2s ease-in-out 1s infinite",
                  }}
                >
                  ⭐
                </div>
                <div
                  className="absolute bottom-[30%] right-[12%] text-5xl opacity-45 z-0"
                  style={{
                    animation: "star-twirl 3.8s ease-in-out 1.5s infinite",
                  }}
                >
                  ⭐
                </div>
              </>
            )}

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

            {/* Custom animations */}
            <style jsx>{`
              @keyframes star-twirl {
                0%,
                100% {
                  transform: rotate(0deg) scale(1);
                  opacity: 0.3;
                }
                25% {
                  transform: rotate(90deg) scale(1.2);
                  opacity: 0.6;
                }
                50% {
                  transform: rotate(180deg) scale(1);
                  opacity: 0.3;
                }
                75% {
                  transform: rotate(270deg) scale(1.2);
                  opacity: 0.6;
                }
              }
            `}</style>
          </>
        )}
      />
    </Screen>
  );
}
