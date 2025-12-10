"use client";

import { twMerge } from "tailwind-merge";
import AlbumArt from "@/components/AlbumArt";
import type { TrackInfo } from "@/databaseTypes";
import type { PopulatedRound, PopulatedUser } from "@/lib/types";
import { OutlinedText } from "@/components/OutlinedText";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";

interface SongScreenProps {
  isActive: boolean;
  title: string;
  subtitle: string;
  trackInfo: TrackInfo;
  round: PopulatedRound;
  points: number;
  pointsStrokeColor: string;
  submittedBy?: PopulatedUser;
  noDataMessage?: string;
}

export function SongScreen({
  isActive,
  title,
  subtitle,
  trackInfo,
  round,
  points,
  pointsStrokeColor,
  submittedBy,
}: SongScreenProps) {
  return (
    <div className="relative h-full overflow-clip">
      <AnimatedImageBackdrop imageUrl={trackInfo.albumImageUrl} />
      <div className="flex flex-col items-center justify-center text-white gap-6 w-full h-full relative p-8">
        <div
          className={twMerge(
            "transition-all duration-500",
            isActive ? "opacity-100 delay-0" : "opacity-0"
          )}
        >
          <h2 className="text-center">{title}</h2>
          <p className="text-2xl text-purple-300 text-center">{subtitle}</p>
        </div>

        <div
          className={twMerge(
            "transition-all duration-500",
            isActive ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-50"
          )}
        >
          <AlbumArt
            trackInfo={trackInfo}
            round={round}
            size={200}
            className="animate-[pulse-glow_2s_ease-in-out_infinite]"
          />
        </div>

        <div
          className={twMerge(
            "text-center transition-all duration-500",
            isActive ? "opacity-100 delay-400" : "opacity-0"
          )}
        >
          <p className="text-3xl md:text-4xl font-bold mb-2">
            {trackInfo.title}
          </p>
          <p className="text-xl md:text-2xl text-purple-200 mb-4">
            {trackInfo.artists.join(", ")}
          </p>
          {submittedBy && (
            <p className="text-lg text-purple-300 mb-2">
              Submitted by {submittedBy.firstName} {submittedBy.lastName}
            </p>
          )}
          <OutlinedText
            className="text-6xl font-bold"
            strokeColor={pointsStrokeColor}
            strokeWidth={2}
          >
            {points} points
          </OutlinedText>
        </div>
      </div>
    </div>
  );
}
