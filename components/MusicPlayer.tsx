"use client";

import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";
import {
  PlayIcon,
  PauseIcon,
  NextIcon,
  PreviousIcon,
  VolumeIcon,
} from "./PlayerIcons";

export default function MusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    deviceId,
    isReady,
    hasInitialized,
    pausePlayback,
    resumePlayback,
    nextTrack,
    previousTrack,
    seekToPosition,
    setPlayerVolume,
    hasNextTrack,
    hasPreviousTrack,
  } = useSpotifyPlayer();

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-linear-to-r from-gray-800 to-gray-900 border-t-2 border-white border-opacity-10 shadow-2xl z-50">
      <div className="max-w-7xl mx-auto px-5 py-4">
        <div className="flex gap-5 items-center">
          {/* Track Display */}
          {currentTrack && (
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={currentTrack.album.images[0]?.url}
                alt="Current track"
                className="w-15 h-15 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-white truncate">
                  {currentTrack.name}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {currentTrack.artists.map((artist) => artist.name).join(", ")}
                </div>
              </div>
            </div>
          )}

          {/* Player Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={previousTrack}
              disabled={!deviceId || !currentTrack || !hasPreviousTrack}
              className="w-10 h-10 rounded-full bg-white bg-opacity-10 text-black flex items-center justify-center transition-all hover:bg-opacity-20 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Previous track"
            >
              <PreviousIcon size={20} className="text-black" />
            </button>

            <button
              onClick={() => {
                if (isPlaying) {
                  pausePlayback();
                } else {
                  resumePlayback();
                }
              }}
              disabled={!deviceId || !currentTrack}
              className="w-12 h-12 rounded-full bg-[#1DB954] text-white flex items-center justify-center transition-all hover:bg-[#1ed760] hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <PauseIcon size={20} className="text-white" />
              ) : (
                <PlayIcon size={20} className="text-white" />
              )}
            </button>

            <button
              onClick={nextTrack}
              disabled={!deviceId || !currentTrack || !hasNextTrack}
              className="w-10 h-10 rounded-full bg-white bg-opacity-10 text-white flex items-center justify-center transition-all hover:bg-opacity-20 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Next track"
            >
              <NextIcon size={20} className="text-black" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3 text-white grow">
            <span className="text-xs text-gray-400 min-w-[35px] text-center">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              className="flex-1 h-1 bg-white bg-opacity-30 rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1DB954] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#1DB954] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => seekToPosition(Number(e.target.value))}
              disabled={!deviceId || !currentTrack}
            />
            <span className="text-xs text-gray-400 min-w-[35px] text-center">
              {formatTime(duration || 0)}
            </span>
          </div>

          {/* Volume Controls */}
          <div className="flex items-center gap-2 text-white justify-end">
            <VolumeIcon size={20} className="text-white" />
            <input
              type="range"
              className="w-20 h-1 bg-white bg-opacity-30 rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1DB954] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#1DB954] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setPlayerVolume(Number(e.target.value))}
              disabled={!deviceId}
            />
          </div>

          {/* Premium Required Message */}
          {!deviceId && !isReady && hasInitialized && (
            <div className="col-span-full text-center">
              <span className="text-red-400 text-xs">
                Premium required for playback
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
