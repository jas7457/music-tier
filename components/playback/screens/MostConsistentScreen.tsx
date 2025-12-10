"use client";

import { Screen } from "../components/Screen";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { UserStatScreen } from "./UserStatScreen";
import { getPlaceText } from "./utils";

export function MostConsistentScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const stat = playback.mostConsistent;

  return (
    <Screen background={{ from: "#ec4899", via: "#f97316", to: "#a855f7" }}>
      <UserStatScreen
        isActive={isActive}
        kicker="Steady as she goes!"
        title="Most Consistent"
        user={stat?.user || null}
        strokeColor={NEON_COLORS.LightBlue}
        stat={{
          value: stat ? `${stat.avgPoints.toFixed(1)} pts/submission` : "",
          label: stat ? `${getPlaceText(stat.place)} place` : "",
          icon: "",
        }}
        noDataMessage="No consistency data available"
      />
    </Screen>
  );
}
