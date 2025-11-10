"use client";

import { PlayIcon, PauseIcon } from "./PlayerIcons";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";

interface AlbumArtProps {
  imageUrl: string;
  trackName: string;
  trackId?: string; // Spotify track ID (without "spotify:" prefix)
  trackUri?: string; // Full Spotify URI like "spotify:track:xxxxx"
  size?: number;
  isPlaying?: boolean;
  onPlayClick?: () => void;
  disabled?: boolean;
  className?: string;
  usePlayerContext?: boolean; // Whether to use the Spotify player context
}

export default function AlbumArt({
  imageUrl,
  trackName,
  trackId,
  trackUri,
  size = 64,
  isPlaying: isPlayingProp,
  onPlayClick,
  disabled: disabledProp,
  className = "",
  usePlayerContext = false,
}: AlbumArtProps) {
  const playerContext = useSpotifyPlayer();

  // Determine if this track is currently playing
  const isCurrentlyPlaying =
    usePlayerContext && playerContext
      ? playerContext.currentTrack?.id === trackId && playerContext.isPlaying
      : isPlayingProp;

  // Determine if player is disabled
  const isDisabled =
    usePlayerContext && playerContext ? !playerContext.deviceId : disabledProp;

  // Handle play click
  const handlePlayClick = async () => {
    if (usePlayerContext && playerContext && trackUri) {
      if (isCurrentlyPlaying) {
        await playerContext.pausePlayback();
      } else if (playerContext.currentTrack?.id === trackId) {
        await playerContext.resumePlayback();
      } else {
        await playerContext.playTrack(trackUri);
      }
    } else if (onPlayClick) {
      onPlayClick();
    }
  };

  const showPlayButton = (usePlayerContext && trackUri) || onPlayClick;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded group ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className="w-full h-full">
        <img
          src={imageUrl}
          alt={trackName}
          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
        />
      </div>

      {showPlayButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isDisabled) {
              handlePlayClick();
            }
          }}
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
      )}
    </div>
  );
}
