"use client";

import { twMerge } from "tailwind-merge";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { OutlinedText } from "@/components/OutlinedText";
import AlbumArt from "@/components/AlbumArt";
import { formatTime } from "./utils";

export function FastestVoterScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const stat = playback.fastestVoter;

  if (!stat) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">No voting data available</p>
      </div>
    );
  }

  const { user, avgTime, fastestSong } = stat;

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
          <h2 className="text-center">Did you even listen to the songs?</h2>
          <p className="text-2xl text-purple-300 text-center">Fastest Voter</p>
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
            <p className="text-lg text-purple-200 mb-2">average time</p>
            <div className="text-4xl font-bold">
              <OutlinedText
                strokeColor={NEON_COLORS.ElectricPurple}
                strokeWidth={2}
              >
                ⚡ {formatTime(avgTime)}
              </OutlinedText>
            </div>
          </div>
        </div>

        {/* Fastest Song */}
        <div
          className={twMerge(
            "w-full transition-all duration-500",
            isActive ? "opacity-100 delay-400" : "opacity-0"
          )}
        >
          <p className="text-center text-purple-200 mb-3">
            Their fastest vote:
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
              <AlbumArt
                trackInfo={fastestSong.trackInfo}
                size={52}
                round={fastestSong.round}
                playlist={[fastestSong.trackInfo]}
              />
              <div className="overflow-hidden">
                <p className="text-lg font-semibold truncate">
                  {fastestSong.trackInfo.title}
                </p>
                <p className="text-sm text-purple-200 truncate">
                  {fastestSong.trackInfo.artists.join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">
                  {formatTime(fastestSong.time)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
