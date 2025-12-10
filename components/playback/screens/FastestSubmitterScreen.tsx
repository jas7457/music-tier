"use client";

import { twMerge } from "tailwind-merge";
import { Screen } from "../components/Screen";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { OutlinedText } from "@/components/OutlinedText";
import AlbumArt from "@/components/AlbumArt";
import { formatTime } from "./utils";
import { HorizontalCarousel } from "../components/HorizontalCarousel";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";

export function FastestSubmitterScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const stat = playback.fastestSubmitters;

  if (stat.length === 0) {
    return (
      <Screen background={{ from: "#06b6d4", via: "#10b981", to: "#8b5cf6" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No submission data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#06b6d4", via: "#10b981", to: "#8b5cf6" }}>
      <HorizontalCarousel
        items={stat}
        isActive={isActive}
        renderItem={(submitter, index, isItemActive) => (
          <div className="h-full flex items-center p-8 text-white overflow-hidden relative">
            <AnimatedImageBackdrop
              imageUrl={submitter.fastestSong.trackInfo.albumImageUrl}
            />

            <div className="w-full flex flex-col gap-4 max-h-full relative z-10">
              {/* Title */}
              <div
                className={twMerge(
                  "transition-all duration-500",
                  isItemActive ? "opacity-100 delay-0" : "opacity-0"
                )}
              >
                <h2 className="text-center">You plan ahead, don&apos;t you?</h2>
                <p className="text-2xl text-purple-300 text-center">
                  {stat.length > 1
                    ? `#${index + 1} Fastest Submitter`
                    : "Fastest Submitter"}
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
                  user={submitter.user}
                  size={60}
                  includeLink={false}
                  isSizePercent
                />
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold mb-2">
                    {submitter.user.firstName} {submitter.user.lastName}
                  </p>
                  <p className="text-lg text-purple-200 mb-2">average time</p>
                  <div className="text-4xl font-bold">
                    <OutlinedText
                      strokeColor={NEON_COLORS.MintyGreen}
                      strokeWidth={2}
                    >
                      ⚡ {formatTime(submitter.avgTime)}
                    </OutlinedText>
                  </div>
                </div>
              </div>

              {/* Fastest Song */}
              <div
                className={twMerge(
                  "w-full transition-all duration-500",
                  isItemActive ? "opacity-100 delay-400" : "opacity-0"
                )}
              >
                <p className="text-center text-purple-200 mb-3">
                  Their fastest submission:
                </p>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                    <AlbumArt
                      trackInfo={submitter.fastestSong.trackInfo}
                      size={52}
                      round={submitter.fastestSong.round}
                      playlist={[submitter.fastestSong.trackInfo]}
                    />
                    <div className="overflow-hidden">
                      <p className="text-lg font-semibold truncate">
                        {submitter.fastestSong.trackInfo.title}
                      </p>
                      <p className="text-sm text-purple-200 truncate">
                        {submitter.fastestSong.trackInfo.artists.join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">
                        {formatTime(submitter.fastestSong.time)}
                      </p>
                    </div>
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
