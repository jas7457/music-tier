"use client";

import { useState, useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import type { PopulatedLeague } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";
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
  const playback = league.playback;
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
        case " ": // Spacebar
          e.preventDefault();
          if (currentScreenIndex < PLAYBACK_SCREENS.length - 1) {
            setCurrentScreenIndex((prev) => prev + 1);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (currentScreenIndex > 0) {
            setCurrentScreenIndex((prev) => prev - 1);
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

  // Sync scroll position when currentScreenIndex changes
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const targetScrollTop = currentScreenIndex * window.innerHeight;
    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });
  }, [isOpen, currentScreenIndex]);

  // Scroll handling with snap
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    let isScrolling = false;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (isScrolling) return;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!containerRef.current) return;

        const scrollTop = containerRef.current.scrollTop;
        const screenHeight = window.innerHeight;
        const newIndex = Math.round(scrollTop / screenHeight);

        if (newIndex !== currentScreenIndex) {
          setCurrentScreenIndex(newIndex);
        }
      }, 50);
    };

    const container = containerRef.current;
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isOpen, currentScreenIndex]);

  if (!isOpen || !playback || !user) return null;

  const currentUserId = user._id;

  const scrollToScreen = (index: number) => {
    setCurrentScreenIndex(index);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-200 bg-black overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Close button */}
      <HapticButton
        onClick={onClose}
        className="fixed top-4 right-4 z-210 w-12 h-12 rounded-full backdrop-blur-xl bg-white/20 border-2 border-white/40 text-white flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110"
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
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-210 flex gap-2 pr-6">
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

      {/* Screens with stacking and scroll-driven animations */}
      {PLAYBACK_SCREENS.map((screen, index) => {
        const Screen = screen.component;
        const isActive = index === currentScreenIndex;
        const isExiting = index === currentScreenIndex - 1;

        return (
          <div
            key={screen.key}
            className="h-screen w-screen snap-start snap-always relative"
          >
            <div className="h-full w-full overflow-hidden">
              <Screen
                playback={playback}
                league={league}
                currentUserId={currentUserId}
                isActive={isActive}
                isExiting={isExiting}
              />
            </div>
          </div>
        );
      })}

      {/* CSS animations for screen transitions */}
      <style jsx>{`
        @keyframes screen-enter {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes screen-exit {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
}
