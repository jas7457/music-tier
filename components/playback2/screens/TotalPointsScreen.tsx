"use client";

import { twMerge } from "tailwind-merge";
import type { PlaybackScreenProps } from "../types";
import { OutlinedText } from "@/components/OutlinedText";
import { NEON_COLORS } from "../constants";
import { Screen } from "../components/Screen";

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
  return "🎖️";
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
    <Screen background={{ from: "#d946ef", via: "#f59e0b", to: "#ec4899" }}>
      <div className="h-full flex flex-col items-center justify-center p-8 text-white gap-8">
        <div
          className={twMerge(
            "transition-all duration-700 transform",
            isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"
          )}
        >
          <p className="text-3xl text-white/90 text-center font-semibold">
            Your Total Points
          </p>
        </div>

        <div
          className={twMerge(
            "transition-all duration-700 delay-200 transform",
            isActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )}
          style={{
            animation: isActive
              ? "pulse-scale 2s ease-in-out infinite"
              : "none",
          }}
        >
          <OutlinedText
            strokeColor={NEON_COLORS.LightBlue}
            strokeWidth={6}
            className="text-9xl md:text-[12rem] font-black"
          >
            {userStats.totalPoints}
          </OutlinedText>
        </div>

        <div
          className={twMerge(
            "text-center transition-all duration-700 delay-400 transform",
            isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          )}
        >
          <p className="text-5xl md:text-6xl font-bold mb-4">
            {medal && (
              <span className="inline-block mr-3 text-6xl animate-bounce">
                {medal}
              </span>
            )}
            {getPlaceText(userStats.place)} Place
          </p>
          <div className="h-1 w-32 mx-auto bg-linear-to-r from-transparent via-white to-transparent opacity-50 mt-6" />
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-scale {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </Screen>
  );
}
