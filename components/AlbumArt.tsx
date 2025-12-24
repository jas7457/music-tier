"use client";

import { PopulatedRound } from "@/lib/types";
import { PlayIcon, PauseIcon } from "./PlayerIcons";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";
import { useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { HapticButton } from "./HapticButton";
import type { TrackInfo } from "@/databaseTypes";
import { isChristmas } from "@/lib/utils/isChristmas";

interface AlbumArtProps {
  trackInfo: TrackInfo;
  size?: number;
  className?: string;
  round: PopulatedRound;
  playlist?: Array<TrackInfo>;
  onPlaySong?: (song: TrackInfo, round: PopulatedRound) => void;
}

export default function AlbumArt({
  round,
  trackInfo: trackInfoProp,
  size = 64,
  className = "",
  playlist,
  onPlaySong,
}: AlbumArtProps) {
  const {
    initializePlaylist,
    currentTrack,
    isPlaying,
    isDisabled,
    pausePlayback,
    resumePlayback,
    playTrack,
  } = useSpotifyPlayer();

  useEffect(() => {
    initializePlaylist(round);
  }, [initializePlaylist, round]);

  const trackInfo = isChristmas()
    ? {
        ...trackInfoProp,
        trackId: "0bYg9bo50gSsH3LtXe2SQn",
        title: "All I Want for Christmas Is You",
        artists: ["Mariah Carey"],
        albumName: "Merry Christmas",
        albumImageUrl:
          "https://i.scdn.co/image/ab67616d0000b273c0862332847213b151ffab31",
      }
    : trackInfoProp;

  const isEffectivelyTheCurrentTrack = (() => {
    if (!currentTrack) {
      return false;
    }
    if (currentTrack.id === trackInfo.trackId) {
      return true;
    }
    if (currentTrack.linked_from?.id === trackInfo.trackId) {
      return true;
    }
    return false;
  })();

  // Determine if this track is currently playing
  const isCurrentlyPlaying = isPlaying && isEffectivelyTheCurrentTrack;

  const playButtonExtraClasses = (() => {
    if (isDisabled) {
      return "bg-gray-500/80 cursor-not-allowed opacity-60";
    }
    if (isCurrentlyPlaying) {
      return "bg-[#1DB954]/90 opacity-100 scale-110";
    }
    return "bg-[#1DB954]/90 opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 hover:bg-[#1ed760] hover:scale-110";
  })();

  return (
    <div
      className={twMerge(
        "relative shrink-0 overflow-hidden rounded group",
        className
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className="w-full h-full">
        <img
          src={trackInfo.albumImageUrl}
          alt={trackInfo.title}
          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
        />
      </div>

      <HapticButton
        type="button"
        style={{
          width: "clamp(40px, 60%, 100px)",
          aspectRatio: "1 / 1",
        }}
        onClick={async (event) => {
          event.stopPropagation();
          event.preventDefault();

          if (isDisabled) {
            return;
          }
          if (isCurrentlyPlaying) {
            await pausePlayback();
          } else if (isEffectivelyTheCurrentTrack) {
            await resumePlayback();
          } else {
            await playTrack({ trackInfo, round, playlist });
          }
          onPlaySong?.(trackInfo, round);
        }}
        disabled={isDisabled}
        className={twMerge(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm pointer-events-auto z-10",
          playButtonExtraClasses
        )}
        title={
          isDisabled
            ? "Spotify Premium required"
            : isCurrentlyPlaying
            ? "Pause"
            : "Play"
        }
      >
        {isCurrentlyPlaying ? (
          <PauseIcon size="50%" className="text-white" />
        ) : (
          <PlayIcon size="50%" className="text-white" />
        )}
      </HapticButton>
    </div>
  );
}
