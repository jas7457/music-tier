"use client";

import { twMerge } from "tailwind-merge";
import type { PlaybackScreenProps } from "../types";
import { Screen } from "../components/Screen";

export function IntroScreen({ isActive }: PlaybackScreenProps) {
  return (
    <Screen background={{ from: "#1e1b4b", via: "#7c3aed", to: "#000000" }}>
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <h1
          className={twMerge(
            "text-5xl md:text-7xl font-bold text-center mb-8 transition-all duration-700",
            isActive
              ? "opacity-100 animate-[scale-in_0.7s_ease-out]"
              : "opacity-0"
          )}
        >
          Playlist Party Playback
        </h1>

        <div
          className={twMerge(
            "flex flex-col items-center gap-4 transition-all duration-700 delay-300",
            isActive
              ? "opacity-100 animate-[slide-up-fade-in_0.7s_ease-out_0.3s_both]"
              : "opacity-0"
          )}
        >
          <div className="animate-[float_2s_ease-in-out_infinite]">
            <svg
              className="w-12 h-12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </div>
          <p className="text-xl">Swipe up or scroll to begin</p>
        </div>
      </div>
    </Screen>
  );
}
