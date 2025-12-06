"use client";

import { PopulatedRound, PopulatedSubmission } from "@/lib/types";
import { PlayIcon, PauseIcon } from "./PlayerIcons";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";
import { useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { HapticButton } from "./HapticButton";

interface AlbumArtProps {
  submission: PopulatedSubmission;
  size?: number;
  className?: string;
  round: PopulatedRound;
}

export default function AlbumArt({
  round,
  submission,
  size = 64,
  className = "",
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

  const isEffectivelyTheCurrentTrack = (() => {
    if (!currentTrack) {
      return false;
    }
    if (currentTrack.id === submission.trackInfo.trackId) {
      return true;
    }
    if (currentTrack.linked_from?.id === submission.trackInfo.trackId) {
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
          src={submission.trackInfo.albumImageUrl}
          alt={submission.trackInfo.title}
          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
        />
      </div>

      <HapticButton
        type="button"
        onClick={async (event) => {
          event.stopPropagation();
          event.preventDefault();

          if (isDisabled || !submission) {
            return;
          }
          if (isCurrentlyPlaying) {
            await pausePlayback();
          } else if (isEffectivelyTheCurrentTrack) {
            await resumePlayback();
          } else {
            await playTrack(submission.trackInfo, round);
          }
        }}
        disabled={isDisabled}
        className={twMerge(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm pointer-events-auto z-10",
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
          <PauseIcon size={16} className="text-white" />
        ) : (
          <PlayIcon size={16} className="text-white" />
        )}
      </HapticButton>
    </div>
  );
}
