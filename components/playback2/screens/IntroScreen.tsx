"use client";

import { twMerge } from "tailwind-merge";
import type { PlaybackScreenProps } from "../types";
import { Screen } from "../components/Screen";

export function IntroScreen({ isActive, league }: PlaybackScreenProps) {
  return (
    <Screen background={{ from: "#1e1b4b", via: "#7c3aed", to: "#000000" }}>
      <div className="h-full flex flex-col items-center justify-center p-8 text-white relative">
        {/* League title with elegant styling */}
        <div
          className={twMerge(
            "mb-8 transition-all duration-1000",
            isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10"
          )}
        >
          <p className="text-sm uppercase tracking-widest text-purple-300 text-center mb-2 font-light">
            Presenting
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white drop-shadow-lg">
            {league.title}
          </h2>
        </div>

        {/* Animated title with text effects */}
        <h1
          className={twMerge(
            "text-6xl md:text-8xl font-bold text-center mt-20 mb-10 transition-all duration-1000 delay-200 bg-clip-text text-transparent bg-linear-to-r from-purple-400 via-pink-400 to-blue-400",
            isActive
              ? "opacity-100 scale-100 blur-0"
              : "opacity-0 scale-90 blur-sm"
          )}
          style={{
            animation: isActive
              ? "title-glow 3s ease-in-out infinite, title-float 4s ease-in-out infinite"
              : "none",
          }}
        >
          Playlist Party Playback
        </h1>

        {/* Scroll indicator with bouncing animation */}
        <div
          className={twMerge(
            "flex flex-col items-center gap-6 transition-all duration-1000 delay-600",
            isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          )}
        >
          <div
            className="relative"
            style={{
              animation: isActive
                ? "bounce-smooth 2s ease-in-out infinite"
                : "none",
            }}
          >
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse" />
            <svg
              className="w-16 h-16 relative z-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
          <p className="text-xl text-white/90 font-medium">
            Scroll or swipe to begin
          </p>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes title-glow {
          0%,
          100% {
            filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 40px rgba(236, 72, 153, 0.7));
          }
        }

        @keyframes title-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes bounce-smooth {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(15px);
          }
        }
      `}</style>
    </Screen>
  );
}
