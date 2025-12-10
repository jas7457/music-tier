"use client";

import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { UserStatScreen } from "./UserStatScreen";
import { formatTime } from "./utils";

export function SlowestVoterScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const stat = playback.slowestVoter;

  return (
    <UserStatScreen
      isActive={isActive}
      kicker="Always fashionably late"
      title="Slowest Voter"
      user={stat?.user || null}
      strokeColor={NEON_COLORS.BrightOrange}
      stat={{
        value: stat ? formatTime(stat.avgTime) : "",
        label: "Average voting time",
        icon: "🐌",
      }}
      noDataMessage="No voting data available"
    />
  );
}
