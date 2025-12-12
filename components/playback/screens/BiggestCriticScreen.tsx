"use client";

import { Screen } from "../components/Screen";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { UserStatScreen } from "./UserStatScreen";

export function BiggestCriticScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const biggestCritic = playback.biggestCritic;

  return (
    <Screen background={{ from: "#ef4444", via: "#8b5cf6", to: "#f59e0b" }}>
      <UserStatScreen
        isActive={isActive}
        kicker="You two have beef?"
        title="Your Biggest Critic"
        user={biggestCritic?.user || null}
        strokeColor={NEON_COLORS.YellowGreen}
        stat={{
          value: biggestCritic ? `${biggestCritic.points} points` : "",
          label: "only gave you",
          songs:
            biggestCritic?.songs.map((song) => ({
              ...song,
              rightText: `+${song.points} pts`,
            })) || [],
        }}
        noDataMessage="No critic data available"
      />
    </Screen>
  );
}
