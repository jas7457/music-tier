"use client";

import { useState, useRef, useEffect } from "react";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";
import { PlayIcon, PauseIcon, NextIcon, PreviousIcon } from "./PlayerIcons";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { HapticButton } from "./HapticButton";
import { AnimatedImageBackdrop } from "./AnimatedImageBackdrop";

export default function MusicPlayer({
  isExpanded,
  setIsExpanded,
}: {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}) {
  const {
    currentTrack,
    isPlaying,
    isDisabled,
    pausePlayback,
    resumePlayback,
    nextTrack,
    previousTrack,
    seekToPosition,
    playTrack,
    registerTimeUpdate,
    hasNextTrack,
    hasPreviousTrack,
    playlist,
    currentTrackIndex,
    playlistRound,
  } = useSpotifyPlayer();

  const [showPlaylist, setShowPlaylist] = useState(false);
  const playlistRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);

  // Register time update listener
  useEffect(() => {
    return registerTimeUpdate(setCurrentTime);
  }, [registerTimeUpdate]);

  // Close playlist when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        playlistRef.current &&
        !playlistRef.current.contains(event.target as Node)
      ) {
        setShowPlaylist(false);
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowPlaylist(false);
        setIsExpanded(false);
      }
    }

    if (showPlaylist || isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }
  }, [showPlaylist, isExpanded, setIsExpanded]);

  // Reset drag state when page loses visibility or focus (e.g., iOS app switcher)
  useEffect(() => {
    const resetDragState = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragY(0);
      }
    };

    document.addEventListener("visibilitychange", resetDragState);
    window.addEventListener("blur", resetDragState);

    return () => {
      document.removeEventListener("visibilitychange", resetDragState);
      window.removeEventListener("blur", resetDragState);
    };
  }, [isDragging]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't start drag on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.tagName === "INPUT" ||
      target.closest("button") ||
      target.closest("input")
    ) {
      return;
    }

    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = dragStartY.current - currentY;

    // Only allow upward drag when collapsed
    if (!isExpanded && deltaY > 0) {
      e.preventDefault(); // Prevent page scroll
      setDragY(deltaY);
    }
    // Allow downward drag when expanded
    else if (isExpanded && deltaY < 0) {
      e.preventDefault(); // Prevent page scroll
      setDragY(Math.abs(deltaY));
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    const dragDuration = Date.now() - dragStartTime.current;
    const velocity = dragY / dragDuration;

    if (!isExpanded) {
      // Expand if dragged more than 100px or if flicked up quickly
      if (dragY > 100 || velocity > 0.5) {
        setIsExpanded(true);
      }
    } else {
      // Close if dragged down more than 100px or flicked down quickly
      if (dragY > 100 || velocity > 0.5) {
        setIsExpanded(false);
      }
    }

    // Reset drag state
    setIsDragging(false);
    setDragY(0);
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <div ref={playlistRef}>
      {/* Mobile Collapsed Player */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 w-screen">
        {/* Playlist Panel - Mobile */}
        {showPlaylist && playlist.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 max-h-96 overflow-y-auto rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] bg-white">
            <div className="relative backdrop-blur-3xl bg-linear-to-b from-primary/50 to-primary-dark/50 border-2 border-white/30 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-black/40"></div>

              <div className="relative">
                {playlistRound && (
                  <div className="px-4 py-3 border-b border-white/10">
                    <Link
                      href={`/leagues/${playlistRound.leagueId}/rounds/${playlistRound._id}`}
                      className="text-sm font-semibold text-white hover:text-white/80 transition-colors drop-shadow-lg flex items-center gap-2"
                      onClick={() => setShowPlaylist(false)}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      View Round
                    </Link>
                  </div>
                )}

                <div className="divide-y divide-white/10">
                  {playlist.map((trackInfo, index) => {
                    const isCurrentTrack = index === currentTrackIndex;
                    return (
                      <button
                        key={trackInfo.trackId}
                        onClick={() => playTrack({ trackInfo, round: "same" })}
                        disabled={isDisabled}
                        className={twMerge(
                          "w-full p-3 flex items-center gap-3 transition-all hover:bg-white/10 disabled:cursor-not-allowed",
                          isCurrentTrack ? "bg-white/20" : ""
                        )}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={trackInfo.albumImageUrl}
                            alt={trackInfo.title}
                            className="w-12 h-12 rounded-lg object-cover shadow-lg border border-white/30"
                          />
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-semibold text-sm text-white truncate drop-shadow-lg">
                            {trackInfo.title}
                          </div>
                          <div className="text-xs text-white/80 truncate drop-shadow-md">
                            {trackInfo.artists.join(", ")}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          onClick={() => !isDragging && setIsExpanded(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative backdrop-blur-md bg-linear-to-b from-primary/60 to-primary-dark/60 border-t-2 border-white/30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] cursor-pointer active:opacity-90 touch-none"
        >
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="relative p-4 flex items-center gap-3">
            {/* Album Art */}
            <div className="relative">
              {isPlaying && (
                <div className="absolute inset-0 rounded-lg animate-spin-slow">
                  <div className="absolute inset-0 rounded-lg bg-linear-to-r from-primary/80 to-primary-dark/80 blur-sm"></div>
                </div>
              )}
              <img
                src={currentTrack.album.images[0]?.url}
                alt="Current track"
                className={twMerge(
                  "relative w-12 h-12 rounded-lg object-cover shrink-0 shadow-xl border-2",
                  isPlaying ? "border-white/60" : "border-white/30"
                )}
              />
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-white truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {currentTrack.name}
              </div>
              <div className="text-xs text-white/90 truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {currentTrack.artists.map((artist) => artist.name).join(", ")}
              </div>
            </div>

            {/* Playlist Button */}
            <HapticButton
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylist(!showPlaylist);
              }}
              disabled={playlist.length === 0}
              className="flex items-center gap-1.5 p-3 rounded-full backdrop-blur-xl bg-white/20 border-2 border-white/40 text-white transition-all hover:bg-white/30 disabled:opacity-30 touch-auto"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </HapticButton>

            {/* Play/Pause Button */}
            <HapticButton
              onClick={(e) => {
                e.stopPropagation();
                if (isPlaying) {
                  pausePlayback();
                } else {
                  resumePlayback();
                }
              }}
              disabled={isDisabled}
              className="w-12 h-12 rounded-full backdrop-blur-xl bg-linear-to-br from-green-400 to-emerald-500 border-2 border-white/60 text-white flex items-center justify-center transition-all hover:from-green-300 hover:to-emerald-400 disabled:opacity-30 shadow-lg touch-auto"
            >
              {isPlaying ? (
                <PauseIcon size={20} className="text-white" />
              ) : (
                <PlayIcon size={20} className="text-white" />
              )}
            </HapticButton>
          </div>
        </div>
      </div>

      {/* Mobile Expanded Player */}
      <div
        className={twMerge(
          "md:hidden fixed inset-0 z-100 touch-none overflow-hidden",
          !isDragging && "transition-transform duration-300 ease-out",
          !isDragging && (isExpanded ? "translate-y-0" : "translate-y-full"),
          !isExpanded && !isDragging && "pointer-events-none"
        )}
        style={
          isDragging && !isExpanded
            ? { transform: `translateY(calc(100% - ${dragY}px))` }
            : isDragging && isExpanded
            ? { transform: `translateY(${dragY}px)` }
            : undefined
        }
        onTouchStart={isExpanded ? handleTouchStart : undefined}
        onTouchMove={isExpanded ? handleTouchMove : undefined}
        onTouchEnd={isExpanded ? handleTouchEnd : undefined}
      >
        {/* Animated Background Album Art */}
        <AnimatedImageBackdrop imageUrl={currentTrack.album.images[0]?.url} />

        <div className="relative flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <HapticButton
              onClick={() => setIsExpanded(false)}
              className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/20 border-2 border-white/40 text-white flex items-center justify-center touch-auto"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </HapticButton>
            <div className="text-sm text-white/80 font-medium">Now Playing</div>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Large Album Art */}
          <div className="flex-1 flex items-center justify-center mb-8">
            <div className="relative w-full max-w-sm aspect-square">
              {isPlaying && (
                <div className="absolute inset-0 rounded-3xl animate-spin-slow">
                  <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-white/30 to-white/10 blur-xl"></div>
                </div>
              )}
              <img
                src={currentTrack.album.images[0]?.url}
                alt="Current track"
                className="relative w-full h-full rounded-3xl object-cover shadow-2xl border-4 border-white/40"
              />
            </div>
          </div>

          {/* Track Info */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              {currentTrack.name}
            </h2>
            <p className="text-lg text-white/90 mb-1 drop-shadow-md">
              {currentTrack.artists.map((artist) => artist.name).join(", ")}
            </p>
            <p className="text-sm text-white/70 drop-shadow-md">
              {currentTrack.album.name}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <input
              type="range"
              className="w-full h-2 bg-white/30 backdrop-blur-sm rounded-full appearance-none cursor-pointer touch-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
              min="0"
              max={currentTrack.duration_ms || 0}
              value={currentTime}
              onChange={(e) => seekToPosition(Number(e.target.value))}
              disabled={isDisabled}
            />
            <div className="flex justify-between mt-2 text-xs text-white/80 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(currentTrack.duration_ms || 0)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <HapticButton
              onClick={previousTrack}
              disabled={isDisabled || !hasPreviousTrack}
              className="w-16 h-16 rounded-full backdrop-blur-xl bg-white/20 border-2 border-white/40 text-white flex items-center justify-center transition-all hover:bg-white/30 hover:scale-105 disabled:opacity-30 touch-auto"
            >
              <PreviousIcon size={28} className="text-white" />
            </HapticButton>

            <HapticButton
              onClick={() => {
                if (isPlaying) {
                  pausePlayback();
                } else {
                  resumePlayback();
                }
              }}
              disabled={isDisabled}
              className="w-20 h-20 rounded-full backdrop-blur-xl bg-linear-to-br from-green-400 to-emerald-500 border-2 border-white/60 text-white flex items-center justify-center transition-all hover:scale-105 shadow-2xl disabled:opacity-30 touch-auto"
            >
              {isPlaying ? (
                <PauseIcon size={32} className="text-white" />
              ) : (
                <PlayIcon size={32} className="text-white" />
              )}
            </HapticButton>

            <HapticButton
              onClick={nextTrack}
              disabled={isDisabled || !hasNextTrack}
              className="w-16 h-16 rounded-full backdrop-blur-xl bg-white/20 border-2 border-white/40 text-white flex items-center justify-center transition-all hover:bg-white/30 hover:scale-105 disabled:opacity-30 touch-auto"
            >
              <NextIcon size={28} className="text-white" />
            </HapticButton>
          </div>
        </div>
      </div>

      {/* Desktop Player */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-50 w-screen">
        <div className="relative backdrop-blur-md bg-linear-to-b from-primary/60 to-primary-dark/60 border-t-2 border-white/30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-black/30"></div>

          <div className="relative px-5 py-3">
            <div className="flex gap-5 items-center">
              {/* Track Display */}
              <div className="flex grow items-center gap-3 min-w-0 w-52 max-w-[35%]">
                <div className="relative">
                  {isPlaying && (
                    <div className="absolute inset-0 rounded-2xl animate-spin-slow">
                      <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-primary/80 to-primary-dark/80 blur-sm"></div>
                    </div>
                  )}

                  <img
                    src={currentTrack.album.images[0]?.url}
                    alt="Current track"
                    className={twMerge(
                      "relative w-15 h-15 rounded-2xl object-cover shrink-0 shadow-xl border-2",
                      isPlaying ? "border-white/60" : "border-white/30"
                    )}
                  />
                  <div className="absolute inset-0 rounded-2xl bg-linear-to-tr from-white/10 to-transparent pointer-events-none"></div>
                </div>
                <div className="min-w-0 flex-1 flex items-center gap-2">
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
                </div>
              </div>

              <div className="max-w-3xl grid grid-rows-1 gap-1 mx-auto grow shrink">
                {/* Player Controls */}
                <div className="flex items-center justify-center gap-4">
                  <HapticButton
                    onClick={previousTrack}
                    disabled={isDisabled || !currentTrack || !hasPreviousTrack}
                    className="w-12 h-12 rounded-full backdrop-blur-xl bg-white/30 border-2 border-white/50 text-white flex items-center justify-center transition-all hover:bg-white/40 hover:scale-110 hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title="Previous track"
                  >
                    <PreviousIcon
                      size={20}
                      className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    />
                  </HapticButton>

                  <HapticButton
                    onClick={() => {
                      if (isPlaying) {
                        pausePlayback();
                      } else {
                        resumePlayback();
                      }
                    }}
                    disabled={isDisabled || !currentTrack}
                    className="w-14 h-14 rounded-full backdrop-blur-xl bg-linear-to-br from-green-400 to-emerald-500 border-2 border-white/60 text-white flex items-center justify-center transition-all hover:from-green-300 hover:to-emerald-400 hover:scale-110 hover:shadow-[0_0_35px_rgba(16,185,129,0.8)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
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
                  </HapticButton>

                  <HapticButton
                    onClick={nextTrack}
                    disabled={isDisabled || !currentTrack || !hasNextTrack}
                    className="w-12 h-12 rounded-full backdrop-blur-xl bg-white/30 border-2 border-white/50 text-white flex items-center justify-center transition-all hover:bg-white/40 hover:scale-110 hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title="Next track"
                  >
                    <NextIcon
                      size={20}
                      className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    />
                  </HapticButton>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3 text-white grow">
                  <span className="text-xs text-white min-w-[35px] text-center font-bold">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      className="w-full h-2.5 bg-white/30 backdrop-blur-sm rounded-full appearance-none cursor-pointer border-2 border-white/40 shadow-inner [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-linear-to-br [&::-webkit-slider-thumb]:from-white [&::-webkit-slider-thumb]:to-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-3 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(255,255,255,0.7),0_2px_6px_rgba(0,0,0,0.35)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-linear-to-br [&::-moz-range-thumb]:from-white [&::-moz-range-thumb]:to-green-300 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-3 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                      min="0"
                      max={currentTrack?.duration_ms || 0}
                      value={currentTime}
                      onChange={(e) => seekToPosition(Number(e.target.value))}
                      disabled={isDisabled || !currentTrack}
                    />
                  </div>
                  <span className="text-xs text-white min-w-[35px] text-center font-bold">
                    {formatTime(currentTrack?.duration_ms || 0)}
                  </span>
                </div>
              </div>

              {/* Playlist Button */}
              <div className="flex grow items-center justify-end w-52 max-w-[35%] relative">
                <HapticButton
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  disabled={playlist.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl bg-white/30 border-2 border-white/50 text-white transition-all hover:bg-white/40 hover:scale-105 hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Show playlist"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h7"
                    />
                  </svg>
                  <span className="text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {playlist.length}
                  </span>
                </HapticButton>

                {/* Playlist Panel - Floating */}
                {showPlaylist && playlist.length > 0 && (
                  <div className="absolute bottom-full right-0 mb-2 w-96 max-h-96 overflow-y-auto rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] bg-white">
                    <div className="relative backdrop-blur-3xl bg-linear-to-b from-primary/50 to-primary-dark/50 border-2 border-white/30 rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-black/40"></div>

                      <div className="relative">
                        {playlistRound && (
                          <div className="px-4 py-3 border-b border-white/10">
                            <Link
                              href={`/leagues/${playlistRound.leagueId}/rounds/${playlistRound._id}`}
                              className="text-sm font-semibold text-white hover:text-white/80 transition-colors drop-shadow-lg flex items-center gap-2"
                              onClick={() => setShowPlaylist(false)}
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              View Round
                            </Link>
                          </div>
                        )}

                        <div className="divide-y divide-white/10">
                          {playlist.map((trackInfo, index) => {
                            const isCurrentTrack = index === currentTrackIndex;
                            return (
                              <button
                                key={trackInfo.trackId}
                                onClick={() =>
                                  playTrack({ trackInfo, round: "same" })
                                }
                                disabled={isDisabled}
                                className={twMerge(
                                  "w-full p-3 flex items-center gap-3 transition-all hover:bg-white/10 disabled:cursor-not-allowed",
                                  isCurrentTrack ? "bg-white/20" : ""
                                )}
                              >
                                <div className="relative shrink-0">
                                  <img
                                    src={trackInfo.albumImageUrl}
                                    alt={trackInfo.title}
                                    className="w-12 h-12 rounded-lg object-cover shadow-lg border border-white/30"
                                  />
                                </div>

                                <div className="flex-1 min-w-0 text-left">
                                  <div className="font-semibold text-sm text-white truncate drop-shadow-lg">
                                    {trackInfo.title}
                                  </div>
                                  <div className="text-xs text-white/80 truncate drop-shadow-md">
                                    {trackInfo.artists.join(", ")}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
