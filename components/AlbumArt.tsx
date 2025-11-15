"use client";

import { PopulatedRound, PopulatedSubmission } from "@/lib/types";
import { PlayIcon, PauseIcon } from "./PlayerIcons";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";
import { useEffect } from "react";

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
    deviceId,
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

  // Determine if player is disabled
  const isDisabled = !deviceId;

  // Handle play click
  const handlePlayClick = async () => {
    if (isDisabled || !submission) {
      return;
    }
    if (isCurrentlyPlaying) {
      await pausePlayback();
    } else if (isEffectivelyTheCurrentTrack) {
      await resumePlayback();
    } else {
      await playTrack(submission, round);
    }
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded group ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className="w-full h-full">
        <img
          src={submission.trackInfo.albumImageUrl}
          alt={submission.trackInfo.title}
          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
        />
      </div>

      <button
        type="button"
        onClick={handlePlayClick}
        disabled={isDisabled}
        className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-10 h-10 rounded-full
            flex items-center justify-center
            transition-all duration-200 backdrop-blur-sm pointer-events-auto z-10
            ${
              isDisabled
                ? "bg-gray-500 bg-opacity-80 cursor-not-allowed opacity-60"
                : isCurrentlyPlaying
                ? "bg-[#1DB954] bg-opacity-90 opacity-100"
                : "bg-[#1DB954] bg-opacity-90 opacity-0 group-hover:opacity-100 hover:bg-[#1ed760] hover:scale-110"
            }
          `}
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
      </button>
    </div>
  );
}
