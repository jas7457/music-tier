"use client";

import { twMerge } from "tailwind-merge";
import { Screen } from "../components/Screen";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { OutlinedText } from "@/components/OutlinedText";
import { Guesses } from "../components/Guesses";
import { HorizontalCarousel } from "../components/HorizontalCarousel";
import { NEON_COLORS } from "../constants";
import { TrackInfo } from "@/databaseTypes";
import { useState } from "react";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";

export function BestGuesserScreen({ playback, isActive }: PlaybackScreenProps) {
  const stat = playback.bestGuessers;

  const [selectedSongs, setSelectedSongs] = useState<Array<TrackInfo | null>>(
    stat.map(() => null)
  );

  if (stat.length === 0) {
    return (
      <Screen background={{ from: "#10b981", via: "#ef4444", to: "#f97316" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No voting data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#10b981", via: "#ef4444", to: "#f97316" }}>
      <HorizontalCarousel
        items={stat}
        isActive={isActive}
        renderItem={(guesser, index, isItemActive) => {
          const isGoodGuesser = guesser.accuracy >= 0.5;

          return (
            <div className="h-full flex items-center p-8 text-white overflow-hidden relative">
              {selectedSongs[index] && (
                <AnimatedImageBackdrop
                  imageUrl={selectedSongs[index].albumImageUrl}
                />
              )}

              <div className="w-full flex flex-col gap-4 max-h-full relative z-10">
                {/* Title */}
                <div
                  className={twMerge(
                    "transition-all duration-500",
                    isItemActive ? "opacity-100 delay-0" : "opacity-0"
                  )}
                >
                  <h2 className="text-center">
                    {isGoodGuesser
                      ? "Are you a psychic?"
                      : "Better luck next time"}
                  </h2>
                  <p className="text-2xl text-purple-300 text-center">
                    {stat.length > 1
                      ? `#${index + 1} Best Guesser`
                      : "Best Guesser"}
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
                    user={guesser.user}
                    size={75}
                    includeLink={false}
                    isSizePercent
                  />
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-bold mb-2">
                      {guesser.user.firstName} {guesser.user.lastName}
                    </p>
                    <p className="text-lg text-purple-200 mb-2">
                      Vote accuracy
                    </p>
                    <div className="text-4xl font-bold">
                      <span className="mr-2">
                        {isGoodGuesser ? "🎯" : "🎲"}
                      </span>
                      <OutlinedText
                        strokeColor={
                          isGoodGuesser
                            ? NEON_COLORS.BrightGreen
                            : NEON_COLORS.VividRed
                        }
                        strokeWidth={2}
                      >
                        {(guesser.accuracy * 100).toFixed(0)}%
                      </OutlinedText>
                    </div>
                  </div>
                </div>

                {/* Scrollable Guesses List */}
                <Guesses
                  isActive={isItemActive}
                  guesses={guesser.guesses}
                  onPlaySong={(song) =>
                    setSelectedSongs((prev) => {
                      const newSelected = [...prev];
                      newSelected[index] = song;
                      return newSelected;
                    })
                  }
                />
              </div>
            </div>
          );
        }}
      />
    </Screen>
  );
}
