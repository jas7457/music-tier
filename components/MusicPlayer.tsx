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
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Liquid glass background with gradient */}
      <div className="relative backdrop-blur-3xl bg-gradient-to-br from-purple-600/40 via-pink-600/40 to-blue-600/40 border-t-2 border-white/30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {/* Additional glass layer for depth - darker for contrast */}
        <div className="absolute inset-0 bg-black/30"></div>

        <div className="relative px-5 py-3">
          <div className="flex gap-5 items-center">
            {/* Track Display */}
            <div className="flex items-center gap-3 min-w-0 w-52 max-w-[35%]">
              {currentTrack && (
                <>
                  <div className="relative">
                    <img
                      src={currentTrack.album.images[0]?.url}
                      alt="Current track"
                      className="w-15 h-15 rounded-2xl object-cover shrink-0 shadow-xl border-2 border-white/30"
                    />
                    {/* Glassy overlay on album art */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/10 to-transparent"></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-white truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      {currentTrack.name}
                    </div>
                    <div className="text-xs text-white/90 truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                      {currentTrack.artists
                        .map((artist) => artist.name)
                        .join(", ")}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="max-w-3xl grid grid-rows-1 gap-1 mx-auto w-full grow shrink">
              {/* Player Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={previousTrack}
                  disabled={!deviceId || !currentTrack || !hasPreviousTrack}
                  className="w-12 h-12 rounded-full backdrop-blur-xl bg-white/30 border-2 border-white/50 text-white flex items-center justify-center transition-all hover:bg-white/40 hover:scale-110 hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                  title="Previous track"
                >
                  <PreviousIcon
                    size={20}
                    className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  />
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
                  className="w-14 h-14 rounded-full backdrop-blur-xl bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white/60 text-white flex items-center justify-center transition-all hover:from-green-300 hover:to-emerald-400 hover:scale-110 hover:shadow-[0_0_35px_rgba(16,185,129,0.8)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <PauseIcon
                      size={22}
                      className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    />
                  ) : (
                    <PlayIcon
                      size={22}
                      className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    />
                  )}
                </button>

                <button
                  onClick={nextTrack}
                  disabled={!deviceId || !currentTrack || !hasNextTrack}
                  className="w-12 h-12 rounded-full backdrop-blur-xl bg-white/30 border-2 border-white/50 text-white flex items-center justify-center transition-all hover:bg-white/40 hover:scale-110 hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                  title="Next track"
                >
                  <NextIcon
                    size={20}
                    className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-3 text-white grow">
                <span className="text-xs text-white min-w-[35px] text-center font-bold">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    className="w-full h-2.5 bg-white/30 backdrop-blur-sm rounded-full appearance-none cursor-pointer border-2 border-white/40 shadow-inner [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-linear-to-br [&::-webkit-slider-thumb]:from-white [&::-webkit-slider-thumb]:to-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-3 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(255,255,255,0.7),0_2px_6px_rgba(0,0,0,0.35)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-white [&::-moz-range-thumb]:to-green-300 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-3 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => seekToPosition(Number(e.target.value))}
                    disabled={!deviceId || !currentTrack}
                  />
                </div>
                <span className="text-xs text-white min-w-[35px] text-center font-bold">
                  {formatTime(duration || 0)}
                </span>
              </div>
            </div>

            {/* Volume Controls */}
            <div className="flex items-center gap-3 text-white justify-end w-52 max-w-[35%]">
              <VolumeIcon
                size={20}
                className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              />
              <div className="relative flex-1">
                <input
                  type="range"
                  className="w-full h-2.5 bg-white/30 backdrop-blur-sm rounded-full appearance-none cursor-pointer border-2 border-white/40 shadow-inner [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-white [&::-webkit-slider-thumb]:to-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-3 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(255,255,255,0.7),0_2px_6px_rgba(0,0,0,0.35)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-white [&::-moz-range-thumb]:to-purple-300 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-3 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setPlayerVolume(Number(e.target.value))}
                  disabled={!deviceId}
                />
              </div>
            </div>
          </div>

          {/* Premium Required Message */}
          {!deviceId && !isReady && hasInitialized && (
            <div className="col-span-full text-center mt-2">
              <div className="inline-block backdrop-blur-xl bg-red-500/50 border-2 border-red-300/60 rounded-full px-4 py-1.5 shadow-lg">
                <span className="text-white text-xs font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  Premium required for playback
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
