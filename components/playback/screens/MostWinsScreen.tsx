"use client";

import { Screen } from "../components/Screen";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { UserStatScreen } from "./UserStatScreen";
import { HorizontalCarousel } from "../components/HorizontalCarousel";

export function MostWinsScreen({ playback, isActive }: PlaybackScreenProps) {
  const stat = playback.mostWinsUsers;

  if (stat.length === 0) {
    return (
      <Screen background={{ from: "#8b5cf6", via: "#06b6d4", to: "#ef4444" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No wins data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#8b5cf6", via: "#06b6d4", to: "#ef4444" }}>
      <HorizontalCarousel
        items={stat}
        isActive={isActive}
        renderItem={(winner, index, isItemActive) => (
          <UserStatScreen
            isActive={isItemActive}
            kicker="Impressive!"
            autoSelectFirstSong
            title={
              stat.length > 1
                ? `#${index + 1} Most 1st Place Wins`
                : "Most 1st Place Wins"
            }
            user={winner.user}
            strokeColor={NEON_COLORS.BrightBlue}
            stat={{
              value: winner.wins.length,
              label: winner.wins.length === 1 ? "win" : "wins",
              icon: "🥇",
              songs: winner.wins,
            }}
            noDataMessage="No wins data available"
          />
        )}
      />
    </Screen>
  );
}
