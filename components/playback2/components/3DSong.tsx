"use client";

import AlbumArt from "@/components/AlbumArt";
import type { TrackInfo } from "@/databaseTypes";
import type { PopulatedRound } from "@/lib/types";
import { useProminentColor } from "../utils";

interface ThreeDSongProps {
  trackInfo: TrackInfo;
  round: PopulatedRound;
  size?: number;
  isActive: boolean;
  onPlaySong?: (song: TrackInfo) => void;
  playlist?: TrackInfo[];
}

export function ThreeDSong({
  trackInfo,
  round,
  size = 300,
  isActive,
  onPlaySong,
  playlist,
}: ThreeDSongProps) {
  const glowColor = useProminentColor(trackInfo.albumImageUrl, "transparent");

  return (
    <div className="relative">
      {/* Pulsing glow rings */}
      <div
        className="absolute inset-0 rounded-lg opacity-60"
        style={{
          background: glowColor || "transparent",
          filter: "blur(30px)",
          animation: isActive ? "glow-pulse-1 3s ease-in-out infinite" : "none",
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
              size={size}
              className="relative"
              playlist={playlist}
              onPlaySong={onPlaySong}
            />
          </div>
        </div>
      </div>

      {/* Custom animations */}
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
