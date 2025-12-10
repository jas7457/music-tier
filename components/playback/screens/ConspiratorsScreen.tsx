"use client";

import { twMerge } from "tailwind-merge";
import { Screen } from "../components/Screen";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { OutlinedText } from "@/components/OutlinedText";
import { NEON_COLORS } from "../constants";

export function ConspiratorsScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  if (!playback.conspirators) {
    return (
      <Screen background={{ from: "#a855f7", via: "#1e1b4b", to: "#f97316" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No conspiracy data available</p>
        </div>
      </Screen>
    );
  }

  const { userId1, userId2, totalPoints } = playback.conspirators;
  const user1 = league.users.find((u) => u._id === userId1);
  const user2 = league.users.find((u) => u._id === userId2);

  if (!user1 || !user2) {
    return (
      <Screen background={{ from: "#a855f7", via: "#1e1b4b", to: "#f97316" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">Users not found</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#a855f7", via: "#1e1b4b", to: "#f97316" }}>
      <div className="h-full flex flex-col items-center justify-center p-8 text-white gap-8">
        <div
          className={twMerge(
            "transition-all duration-500",
            isActive ? "opacity-100 delay-0" : "opacity-0"
          )}
        >
          <h2 className="text-center">You must be working together.</h2>
          <p className="text-2xl text-purple-300 text-center">The Conspirators</p>
        </div>

        <div
          className={twMerge(
            "flex items-center gap-4 transition-all duration-500",
            isActive ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-50"
          )}
        >
          <Avatar user={user1} size={100} includeLink={false} isSizePercent />
          <div className="text-4xl">🤝</div>
          <Avatar user={user2} size={100} includeLink={false} isSizePercent />
        </div>

        <div
          className={twMerge(
            "text-center transition-all duration-500",
            isActive ? "opacity-100 delay-400" : "opacity-0"
          )}
        >
          <p className="text-2xl md:text-3xl font-bold mb-2">
            {user1.firstName} & {user2.firstName}
          </p>
          <p className="text-xl text-purple-200 mb-4">
            exchanged the most points
          </p>
          <OutlinedText
            className="text-6xl md:text-8xl font-bold"
            strokeColor={NEON_COLORS.DeepViolet}
            strokeWidth={3}
          >
            {totalPoints} points
          </OutlinedText>
        </div>
      </div>
    </Screen>
  );
}
