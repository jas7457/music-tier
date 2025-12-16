"use client";

import { twMerge } from "tailwind-merge";
import type { TrackInfo } from "@/databaseTypes";
import type { PopulatedRound } from "@/lib/types";
import AlbumArt from "@/components/AlbumArt";
import { useMemo, useState } from "react";

type Song = {
  trackInfo: TrackInfo;
  round: PopulatedRound;
  rightText?: React.ReactNode;
  leftText?: React.ReactNode;
  className?: string;
};

export interface SongsProps {
  songs: Array<Song>;
  isActive: boolean;
  onPlaySong?: (song: TrackInfo) => void;
  className?: string;
}

const delay = 300;

export function Songs({ songs, isActive, onPlaySong, className }: SongsProps) {
  const playlist = useMemo(() => {
    return songs.map((song) => song.trackInfo);
  }, [songs]);

  // Generate random delays for shimmer effect (0-4s range)
  const shimmerDelays = useState(() => songs.map(() => Math.random() * 4))[0];

  return (
    <div className={twMerge("flex-1 w-full", className)}>
      <div className="space-y-3">
        {songs.map((song, index) => (
          <div
            key={index}
            className={twMerge(
              "bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 transition-all duration-700 transform hover:bg-white/20 hover:border-white/40 relative overflow-hidden",
              isActive
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-10",
              song.className
            )}
            style={{
              transitionDelay: isActive ? `${index * delay}ms` : "0ms",
              animation: isActive
                ? `slide-in-bounce 0.6s ease-out ${index * delay}ms both`
                : "none",
            }}
          >
            {/* Shimmer overlay */}
            {isActive && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  animation: `shimmer 4s ease-in-out ${shimmerDelays[index]}s infinite`,
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                  transform: "translateX(-100%)",
                }}
              />
            )}

            <div
              className={twMerge(
                "grid items-center gap-3",
                song.leftText
                  ? "grid-cols-[auto_auto_1fr_auto]"
                  : "grid-cols-[auto_1fr_auto]"
              )}
            >
              {song.leftText && <div className="text-2xl">{song.leftText}</div>}
              <AlbumArt
                trackInfo={song.trackInfo}
                size={56}
                round={song.round}
                playlist={playlist}
                onPlaySong={onPlaySong}
              />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate drop-shadow-lg">
                  {song.trackInfo.title}
                </p>
                <p className="text-xs text-purple-200 truncate">
                  {song.trackInfo.artists.join(", ")}
                </p>
              </div>
              {song.rightText && (
                <div
                  className="text-right"
                  style={{
                    animation: isActive
                      ? `points-pop 0.4s ease-out ${index * delay + 300}ms both`
                      : "none",
                  }}
                >
                  <div className="text-lg font-bold text-green-400 drop-shadow-lg">
                    {song.rightText}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes slide-in-bounce {
          0% {
            opacity: 0;
            transform: translateX(-50px);
          }
          60% {
            opacity: 1;
            transform: translateX(5px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes points-pop {
          0% {
            opacity: 0;
            transform: scale(0) rotate(-20deg);
          }
          70% {
            transform: scale(1.3) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}
