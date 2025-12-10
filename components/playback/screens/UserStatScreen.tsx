"use client";

import { twMerge } from "tailwind-merge";
import { Avatar } from "@/components/Avatar";
import type { PopulatedRound, PopulatedUser } from "@/lib/types";
import { OutlinedText } from "@/components/OutlinedText";
import { TrackInfo } from "@/databaseTypes";
import { Songs } from "../components/Songs";
import { useState } from "react";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";

interface UserStatScreenProps {
  isActive: boolean;
  kicker: string;
  title: string;
  user: PopulatedUser | null;
  strokeColor: string;
  autoSelectFirstSong?: boolean;
  stat: {
    value: string | number;
    label: string;
    icon?: string;
    songs?: Array<{
      trackInfo: TrackInfo;
      points: number;
      round: PopulatedRound;
    }>;
  };
  noDataMessage?: string;
}

export function UserStatScreen({
  isActive,
  kicker,
  title,
  user,
  stat,
  strokeColor,
  noDataMessage = "No data available",
  autoSelectFirstSong = false,
}: UserStatScreenProps) {
  const [currentSong, setCurrentSong] = useState<TrackInfo | null>(
    autoSelectFirstSong && stat.songs?.[0] ? stat.songs[0].trackInfo : null
  );

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">{noDataMessage}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-8 text-white overflow-hidden relative">
      {currentSong && (
        <AnimatedImageBackdrop imageUrl={currentSong.albumImageUrl} />
      )}
      <div className="w-full flex flex-col gap-8 max-h-full relative z-10">
        <div
          className={twMerge(
            "transition-all duration-500",
            isActive ? "opacity-100 delay-0" : "opacity-0"
          )}
        >
          <h2 className="text-center">{kicker}</h2>
          <p className="text-2xl text-purple-300 text-center">{title}</p>
        </div>

        <div
          className={twMerge(
            "transition-all duration-500 flex justify-center",
            isActive ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-50"
          )}
        >
          <Avatar user={user} size={60} includeLink={false} isSizePercent />
        </div>

        <div
          className={twMerge(
            "text-center transition-all duration-500",
            isActive ? "opacity-100 delay-400" : "opacity-0"
          )}
        >
          <p className="text-3xl md:text-4xl font-bold mb-4">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xl text-purple-200 mb-2">{stat.label}</p>
          <div className="text-6xl font-bold wrap-break-word break-all">
            {stat.icon && <span className="mr-1">{stat.icon}</span>}
            <OutlinedText strokeColor={strokeColor} strokeWidth={2}>
              {stat.value}
            </OutlinedText>
          </div>
        </div>
        {/* Scrollable Songs List */}
        {stat.songs && (
          <Songs
            songs={stat.songs}
            isActive={isActive}
            onPlaySong={(song) => {
              if (isActive) {
                setCurrentSong(song);
              } else {
                setCurrentSong(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
