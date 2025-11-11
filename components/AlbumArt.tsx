"use client";

import { PopulatedRound, PopulatedTrackInfo } from "@/lib/types";
import { PlayIcon, PauseIcon } from "./PlayerIcons";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";

interface AlbumArtProps {
  trackInfo: PopulatedTrackInfo;
  size?: number;
  className?: string;
  round: PopulatedRound;
}

export default function AlbumArt({
  round,
  trackInfo,
  size = 64,
  className = "",
}: AlbumArtProps) {
  const trackUri = `spotify:track:${trackInfo.trackId}`;
  const playerContext = useSpotifyPlayer();

  // Determine if this track is currently playing
  const isCurrentlyPlaying =
    playerContext.currentTrack?.id === trackInfo.trackId &&
    playerContext.isPlaying;

  // Determine if player is disabled
  const isDisabled = !playerContext.deviceId;

  // Handle play click
  const handlePlayClick = async () => {
    if (isDisabled) {
      return;
    }
    if (trackUri) {
      if (isCurrentlyPlaying) {
        await playerContext.pausePlayback();
      } else if (playerContext.currentTrack?.id === trackInfo.trackId) {
        await playerContext.resumePlayback();
      } else {
        await playerContext.playTrack(trackUri, round);
      }
    }
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded group ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className="w-full h-full">
        <img
          src={trackInfo.albumImageUrl}
          alt={trackInfo.title}
          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
        />
      </div>

      <button
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
