"use client";

import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { UserStatScreen } from "./UserStatScreen";

export function MostWinsScreen({ playback, isActive }: PlaybackScreenProps) {
  const stat = playback.mostWinsUser;

  return (
    <UserStatScreen
      isActive={isActive}
      kicker="Impressive!"
      title="Most 1st Place Wins"
      user={stat?.user || null}
      strokeColor={NEON_COLORS.BrightBlue}
      stat={{
        value: stat ? `🥇${stat.wins}` : "",
        label: stat?.wins === 1 ? "win" : "wins",
        icon: "",
      }}
      noDataMessage="No wins data available"
    />
  );
}
