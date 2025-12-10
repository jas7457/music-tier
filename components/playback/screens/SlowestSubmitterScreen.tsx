"use client";

import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { UserStatScreen } from "./UserStatScreen";
import { formatTime } from "./utils";

export function SlowestSubmitterScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const stat = playback.slowestSubmitter;

  return (
    <UserStatScreen
      isActive={isActive}
      kicker="Gotta pick the perfect song"
      title="Slowest Submitter"
      user={stat?.user || null}
      strokeColor={NEON_COLORS.BrightGreen}
      stat={{
        value: stat ? formatTime(stat.avgTime) : "",
        label: "Average submission time",
        icon: "🐌",
      }}
      noDataMessage="No submission data available"
    />
  );
}
