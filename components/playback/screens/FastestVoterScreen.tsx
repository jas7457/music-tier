"use client";

import { twMerge } from "tailwind-merge";
import { Screen } from "../components/Screen";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { OutlinedText } from "@/components/OutlinedText";
import { formatTime } from "./utils";
import { HorizontalCarousel } from "../components/HorizontalCarousel";

export function FastestVoterScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const stat = playback.fastestVoters;

  if (stat.length === 0) {
    return (
      <Screen background={{ from: "#3b82f6", via: "#a855f7", to: "#10b981" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No voting data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#3b82f6", via: "#a855f7", to: "#10b981" }}>
      <HorizontalCarousel
        items={stat}
        isActive={isActive}
        renderItem={(voter, index, isItemActive) => (
          <div className="h-full flex items-center p-8 text-white">
            <div className="w-full flex flex-col gap-4 max-h-full">
              {/* Title */}
              <div
                className={twMerge(
                  "transition-all duration-500",
                  isItemActive ? "opacity-100 delay-0" : "opacity-0"
                )}
              >
                <h2 className="text-center">Did you even listen to the songs?</h2>
                <p className="text-2xl text-purple-300 text-center">
                  {stat.length > 1
                    ? `#${index + 1} Fastest Voter`
                    : "Fastest Voter"}
                </p>
              </div>

              {/* User Info */}
              <div
                className={twMerge(
                  "flex flex-col items-center gap-3 transition-all duration-500",
                  isItemActive
                    ? "opacity-100 scale-100 delay-200"
                    : "opacity-0 scale-50"
                )}
              >
                <Avatar
                  user={voter.user}
                  size={60}
                  includeLink={false}
                  isSizePercent
                />
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold mb-2">
                    {voter.user.firstName} {voter.user.lastName}
                  </p>
                  <p className="text-lg text-purple-200 mb-2">average time</p>
                  <div className="text-4xl font-bold">
                    <OutlinedText
                      strokeColor={NEON_COLORS.ElectricPurple}
                      strokeWidth={2}
                    >
                      ⚡ {formatTime(voter.avgTime)}
                    </OutlinedText>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      />
    </Screen>
  );
}
