"use client";

import { twMerge } from "tailwind-merge";
import type { PlaybackScreenProps } from "../types";
import { OutlinedText } from "@/components/OutlinedText";
import { NEON_COLORS } from "../constants";

function getPlaceText(place: number): string {
  if (place === 1) return "1st";
  if (place === 2) return "2nd";
  if (place === 3) return "3rd";
  return `${place}th`;
}

function getPlaceMedal(place: number): string {
  if (place === 1) return "🥇";
  if (place === 2) return "🥈";
  if (place === 3) return "🥉";
  return "";
}

export function TotalPointsScreen({ playback, isActive }: PlaybackScreenProps) {
  const userStats = playback.userStats;

  if (!userStats) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">No stats data available</p>
      </div>
    );
  }

  const medal = getPlaceMedal(userStats.place);

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-white gap-8">
      <div
        className={twMerge(
          "transition-all duration-500",
          isActive ? "opacity-100 delay-0" : "opacity-0"
        )}
      >
        <p className="text-2xl text-purple-300 text-center">
          Your Total Points
        </p>
      </div>

      <OutlinedText
        strokeColor={NEON_COLORS.LightBlue}
        strokeWidth={8}
        className={twMerge(
          "text-9xl font-bold transition-all duration-500",
          isActive ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-50"
        )}
      >
        {userStats.totalPoints}
      </OutlinedText>

      <div
        className={twMerge(
          "text-center transition-all duration-500",
          isActive ? "opacity-100 delay-400" : "opacity-0"
        )}
      >
        <p className="text-4xl md:text-5xl font-bold">
          {medal && <span className="mr-2">{medal}</span>}
          {getPlaceText(userStats.place)} Place
        </p>
      </div>
    </div>
  );
}
