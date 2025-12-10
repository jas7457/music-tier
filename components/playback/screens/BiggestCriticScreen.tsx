"use client";

import { twMerge } from "tailwind-merge";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { OutlinedText } from "@/components/OutlinedText";
import { Songs } from "../components/Songs";

export function BiggestCriticScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const biggestCritic = playback.biggestCritic;

  if (!biggestCritic) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">No critic data available</p>
      </div>
    );
  }

  const { user, points, songs } = biggestCritic;

  return (
    <div className="h-full flex items-center p-8 text-white">
      <div className="w-full flex flex-col gap-4 max-h-full">
        {/* Title */}
        <div
          className={twMerge(
            "transition-all duration-500",
            isActive ? "opacity-100 delay-0" : "opacity-0"
          )}
        >
          <h2 className="text-center">You two have beef?</h2>
          <p className="text-2xl text-purple-300 text-center">
            Your Biggest Critic
          </p>
        </div>

        {/* User Info */}
        <div
          className={twMerge(
            "flex flex-col items-center gap-3 transition-all duration-500",
            isActive ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-50"
          )}
        >
          <Avatar user={user} size={120} includeLink={false} />
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold mb-2">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-lg text-purple-200 mb-2">only gave you</p>
            <div className="text-4xl font-bold">
              <OutlinedText
                strokeColor={NEON_COLORS.YellowGreen}
                strokeWidth={2}
              >
                {points} points
              </OutlinedText>
            </div>
          </div>
        </div>

        {/* Scrollable Songs List */}
        <Songs songs={songs} isActive={isActive} />
      </div>
    </div>
  );
}
