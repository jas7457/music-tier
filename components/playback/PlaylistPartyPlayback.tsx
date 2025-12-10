"use client";

import { useState, useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import type { PopulatedLeague } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";
import { HapticButton } from "@/components/HapticButton";
import { PLAYBACK_SCREENS } from "./screenConfig";

interface PlaylistPartyPlaybackProps {
  league: PopulatedLeague;
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistPartyPlayback({
  league,
  isOpen,
  onClose,
}: PlaylistPartyPlaybackProps) {
  const { user } = useAuth();
  const { playTrack } = useSpotifyPlayer();
  const playTrackRef = useRef(playTrack);
  // eslint-disable-next-line react-hooks/refs
  playTrackRef.current = playTrack;

  // Get playback stats from server-provided data
  const playback = league.playback;

  // Navigation state
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const screenRefs = useRef<(HTMLDivElement | null)[]>([]);

  // IntersectionObserver to detect active screen
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = Number(entry.target.getAttribute("data-index"));
            setCurrentScreenIndex(index);
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.5,
      }
    );

    screenRefs.current.forEach((screen) => {
      if (screen) observer.observe(screen);
    });

    return () => observer.disconnect();
  }, [isOpen, league._id]);

  // Autoplay track when screen becomes active
  useEffect(() => {
    if (!isOpen || !playback || !user) return;

    const currentScreen = PLAYBACK_SCREENS[currentScreenIndex];
    const trackInfo = currentScreen.trackInfo?.(playback, user._id);

    if (trackInfo && league.rounds.completed.length > 0) {
      const timer = setTimeout(() => {
        // playTrackRef.current(trackInfo, league.rounds.completed[0], [
        //   trackInfo,
        // ]);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [currentScreenIndex, isOpen, playback, user, league.rounds.completed]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      switch (e.key) {
        case "ArrowDown":
        case " ": // Spacebar
          e.preventDefault();
          if (currentScreenIndex < PLAYBACK_SCREENS.length - 1) {
            containerRef.current.scrollTo({
              top: (currentScreenIndex + 1) * window.innerHeight,
              behavior: "smooth",
            });
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (currentScreenIndex > 0) {
            containerRef.current.scrollTo({
              top: (currentScreenIndex - 1) * window.innerHeight,
              behavior: "smooth",
            });
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentScreenIndex, onClose]);

  // Don't render if not open or no playback data or no user
  if (!isOpen || !playback || !user) return null;

  const currentUserId = user._id;

  const scrollToScreen = (index: number) => {
    containerRef.current?.scrollTo({
      top: index * window.innerHeight,
      behavior: "smooth",
    });
  };

  const currentBackground = PLAYBACK_SCREENS[currentScreenIndex].background;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-200 bg-black overflow-y-scroll snap-y snap-mandatory"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        touchAction: "pan-y",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Hide scrollbar with style tag */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Animated swirling background - multiple blob layers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Base gradient layer */}
        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{
            background: `linear-gradient(135deg, ${currentBackground.from}, ${currentBackground.to})`,
          }}
        />
        {/* Blob 1 */}
        <div
          className="absolute w-[800px] h-[800px] -top-40 -left-40 opacity-50 blur-3xl transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle, ${currentBackground.via} 0%, transparent 70%)`,
            animation: "gradient-swirl-1 12s ease-in-out infinite",
          }}
        />
        {/* Blob 2 */}
        <div
          className="absolute w-[600px] h-[600px] top-1/2 right-0 opacity-40 blur-3xl transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle, ${currentBackground.from} 0%, transparent 70%)`,
            animation: "gradient-swirl-2 15s ease-in-out infinite",
          }}
        />
        {/* Blob 3 */}
        <div
          className="absolute w-[700px] h-[700px] bottom-0 left-1/4 opacity-30 blur-3xl transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle, ${currentBackground.to} 0%, transparent 70%)`,
            animation: "gradient-swirl-3 18s ease-in-out infinite",
          }}
        />
      </div>

      {/* Close button */}
      <HapticButton
        onClick={onClose}
        className="fixed top-4 right-4 z-210 w-12 h-12 rounded-full backdrop-blur-xl bg-white/20 border-2 border-white/40 text-white flex items-center justify-center hover:bg-white/30 transition-all"
        aria-label="Close Playlist Party Playback"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </HapticButton>

      {/* Progress indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-210 flex gap-2">
        {PLAYBACK_SCREENS.map((screen, index) => (
          <button
            key={screen.key}
            onClick={() => scrollToScreen(index)}
            className={twMerge(
              "h-2 rounded-full transition-all duration-300",
              index === currentScreenIndex
                ? "bg-white w-8"
                : "bg-white/40 hover:bg-white/60 w-2"
            )}
            aria-label={`Go to screen ${index + 1}`}
          />
        ))}
      </div>

      {/* Screens with scroll snap */}
      {PLAYBACK_SCREENS.map((screen, index) => {
        const Screen = screen.component;
        const isActive = index === currentScreenIndex;
        const isExiting =
          index === currentScreenIndex - 1 || index === currentScreenIndex + 1;

        return (
          <div
            key={screen.key}
            ref={(el) => {
              screenRefs.current[index] = el;
            }}
            data-index={index}
            className="h-screen w-screen snap-start snap-always relative"
          >
            <Screen
              playback={playback}
              league={league}
              currentUserId={currentUserId}
              isActive={isActive}
              isExiting={isExiting}
            />
          </div>
        );
      })}
    </div>
  );
}
