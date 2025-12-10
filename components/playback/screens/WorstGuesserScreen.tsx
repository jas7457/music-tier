"use client";

import { twMerge } from "tailwind-merge";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { OutlinedText } from "@/components/OutlinedText";
import { Guesses } from "../components/Guesses";

export function WorstGuesserScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const stat = playback.worstGuesser;

  if (!stat) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">No voting data available</p>
      </div>
    );
  }

  const { user, accuracy, guesses } = stat;

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
          <h2 className="text-center">Better luck next time</h2>
          <p className="text-2xl text-purple-300 text-center">Worst Guesser</p>
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
            <p className="text-lg text-purple-200 mb-2">Vote accuracy</p>
            <div className="text-4xl font-bold">
              <span className="mr-2">🎲</span>
              <OutlinedText strokeColor="#ef4444" strokeWidth={2}>
                {(accuracy * 100).toFixed(0)}%
              </OutlinedText>
            </div>
          </div>
        </div>

        {/* Scrollable Guesses List */}
        <Guesses isActive={isActive} guesses={guesses} />
      </div>
    </div>
  );
}
