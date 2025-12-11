"use client";

import { twMerge } from "tailwind-merge";
import type { TrackInfo } from "@/databaseTypes";
import type { PopulatedRound, PopulatedUser } from "@/lib/types";
import { OutlinedText } from "@/components/OutlinedText";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";
import { useEffect, useRef } from "react";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";
import { StatBounce } from "../components/Animations";
import { ThreeDSong } from "../components/3DSong";

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
  const { playTrack } = useSpotifyPlayer();
  const playTrackRef = useRef(playTrack);
  // eslint-disable-next-line react-hooks/refs
  playTrackRef.current = playTrack;

  useEffect(() => {
    if (!isActive) {
      return;
    }
    playTrackRef.current({
      trackInfo,
      round,
      playlist: [trackInfo],
      startTime: 15_000,
    });
  }, [isActive, round, trackInfo]);

  return (
    <div className="relative h-full overflow-clip">
      <AnimatedImageBackdrop imageUrl={trackInfo.albumImageUrl} />
      <div className="flex flex-col items-center justify-center text-white gap-8 w-full h-full relative p-8">
        <div
          className={twMerge(
            "transition-all duration-700 transform",
            isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"
          )}
        >
          <h2 className="text-center font-bold mb-2">{title}</h2>
          <p className="text-2xl md:text-3xl text-purple-300 text-center">
            {subtitle}
          </p>
        </div>

        <div
          className={twMerge(
            "transition-all duration-700 delay-200 transform",
            isActive
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-75 rotate-12"
          )}
        >
          <ThreeDSong
            trackInfo={trackInfo}
            round={round}
            size={300}
            isActive={isActive}
            playlist={[trackInfo]}
          />
        </div>

        <div
          className={twMerge(
            "text-center transition-all duration-700 delay-400 transform",
            isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          )}
        >
          <p className="text-3xl md:text-5xl font-bold mb-3">
            {trackInfo.title}
          </p>
          <p className="text-xl md:text-2xl text-purple-200 mb-6">
            {trackInfo.artists.join(", ")}
          </p>
          {submittedBy && (
            <p className="text-lg md:text-xl text-purple-300 mb-4">
              Submitted by {submittedBy.firstName} {submittedBy.lastName}
            </p>
          )}
          <StatBounce isActive={isActive}>
            <OutlinedText
              className="text-6xl md:text-7xl font-bold"
              strokeColor={pointsStrokeColor}
              strokeWidth={3}
            >
              {points} points
            </OutlinedText>
          </StatBounce>
        </div>
      </div>
    </div>
  );
}
