"use client";

import { twMerge } from "tailwind-merge";
import AlbumArt from "@/components/AlbumArt";
import type { TrackInfo } from "@/databaseTypes";
import type { PopulatedRound, PopulatedUser } from "@/lib/types";
import { OutlinedText } from "@/components/OutlinedText";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";
import { useEffect, useRef } from "react";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";
import { useProminentColor } from "../utils";
import { StatBounce } from "../components/Animations";

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

  const glowColor = useProminentColor(trackInfo.albumImageUrl, "transparent");

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
            "transition-all duration-700 delay-200 transform relative",
            isActive
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-75 rotate-12"
          )}
          style={{
            // @ts-ignore
            "--glow-color": glowColor,
          }}
        >
          {/* Pulsing glow rings */}
          <div
            className="absolute inset-0 rounded-lg opacity-60"
            style={{
              background: glowColor || "transparent",
              filter: "blur(30px)",
              animation: isActive
                ? "glow-pulse-1 3s ease-in-out infinite"
                : "none",
            }}
          />
          <div
            className="absolute inset-0 rounded-lg opacity-40"
            style={{
              background: glowColor || "transparent",
              filter: "blur(50px)",
              animation: isActive
                ? "glow-pulse-2 3s ease-in-out 0.5s infinite"
                : "none",
            }}
          />

          {/* Album art with 3D rotation and shadow */}
          <div
            style={{
              perspective: "1200px",
              perspectiveOrigin: "center center",
            }}
          >
            <div
              className="relative"
              style={{
                animation: isActive
                  ? "album-3d-spin 16s ease-in-out infinite"
                  : "none",
                transformStyle: "preserve-3d",
              }}
            >
              {/* 3D shadow layer */}
              <div
                className="absolute inset-0 bg-black/60 rounded-lg"
                style={{
                  transform: "translateZ(-30px) scale(1.05)",
                  filter: "blur(20px)",
                }}
              />

              <div
                style={{
                  transform: "translateZ(0)",
                  boxShadow:
                    "0 20px 60px rgba(0,0,0,0.5), 0 0 100px rgba(0,0,0,0.3)",
                }}
              >
                <AlbumArt
                  trackInfo={trackInfo}
                  round={round}
                  size={300}
                  className="relative"
                />
              </div>
            </div>
          </div>
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

      <style jsx>{`
        @keyframes glow-pulse-1 {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.7;
          }
        }

        @keyframes glow-pulse-2 {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.25);
            opacity: 0.5;
          }
        }

        @keyframes album-3d-spin {
          0% {
            transform: rotateY(-15deg) rotateX(5deg) rotateZ(0deg);
          }
          12.5% {
            transform: rotateY(0deg) rotateX(10deg) rotateZ(2deg);
          }
          25% {
            transform: rotateY(15deg) rotateX(5deg) rotateZ(0deg);
          }
          37.5% {
            transform: rotateY(10deg) rotateX(-5deg) rotateZ(-2deg);
          }
          50% {
            transform: rotateY(0deg) rotateX(-10deg) rotateZ(0deg);
          }
          62.5% {
            transform: rotateY(-10deg) rotateX(-5deg) rotateZ(2deg);
          }
          75% {
            transform: rotateY(-15deg) rotateX(0deg) rotateZ(0deg);
          }
          87.5% {
            transform: rotateY(-10deg) rotateX(8deg) rotateZ(-2deg);
          }
          100% {
            transform: rotateY(-15deg) rotateX(5deg) rotateZ(0deg);
          }
        }
      `}</style>
    </div>
  );
}
