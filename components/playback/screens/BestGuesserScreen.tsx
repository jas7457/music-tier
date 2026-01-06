"use client";

import { Screen } from "../components/Screen";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { HorizontalCarousel } from "../components/HorizontalCarousel";
import { UserStatScreen } from "./UserStatScreen";
import { Avatar } from "@/components/Avatar";

export function BestGuesserScreen({ playback, isActive }: PlaybackScreenProps) {
  const stat = playback.bestGuessers;
  const background = { from: "#10b981", via: "#ef4444", to: "#f97316" };

  if (stat.length === 0) {
    return (
      <Screen background={background}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No voting data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <HorizontalCarousel
        items={stat}
        isActive={isActive}
        renderItem={(guesser, index, isItemActive) => {
          const isGoodGuesser = guesser.accuracy >= 0.5;

          return (
            <>
              {/* Animated background elements - target/accuracy theme */}
              {index === 0 && isItemActive && (
                <div className="absolute h-full w-full pointer-events-none">
                  {/* Concentric target rings */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-4 border-green-400/20 z-10"
                    style={{
                      animation: "target-pulse 3s ease-in-out infinite",
                    }}
                  />
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-4 border-red-400/20 z-10"
                    style={{
                      animation: "target-pulse 3s ease-in-out 1s infinite",
                    }}
                  />
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-4 border-orange-400/20 z-10"
                    style={{
                      animation: "target-pulse 3s ease-in-out 2s infinite",
                    }}
                  />

                  {/* Floating dart/target emojis */}
                  <div
                    className="absolute top-[12%] left-[18%] text-4xl opacity-30 z-10"
                    style={{
                      animation: "dart-fly 4s ease-in-out infinite",
                    }}
                  >
                    🎯
                  </div>
                  <div
                    className="absolute top-[25%] right-[20%] text-3xl opacity-25 z-10"
                    style={{
                      animation: "dart-fly 4s ease-in-out 1s infinite",
                    }}
                  >
                    🎯
                  </div>
                  <div
                    className="absolute bottom-[28%] left-[15%] text-5xl opacity-20 z-10"
                    style={{
                      animation: "dart-fly 4s ease-in-out 2s infinite",
                    }}
                  >
                    🎯
                  </div>
                  <div
                    className="absolute bottom-[15%] right-[12%] text-4xl opacity-25 z-10"
                    style={{
                      animation: "dart-fly 4s ease-in-out 3s infinite",
                    }}
                  >
                    🎯
                  </div>

                  {/* Crosshair indicators */}
                  <div
                    className="absolute top-[40%] right-[10%] text-3xl opacity-30 z-10"
                    style={{
                      animation: "crosshair-spin 5s linear infinite",
                    }}
                  >
                    ⊕
                  </div>
                  <div
                    className="absolute top-[60%] left-[8%] text-4xl opacity-25 z-10"
                    style={{
                      animation: "crosshair-spin 5s linear 2.5s infinite",
                    }}
                  >
                    ⊕
                  </div>

                  {/* Radial accuracy lines */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-32 bg-linear-to-b from-transparent via-green-400/20 to-transparent z-10"
                    style={{
                      animation: "radial-sweep 4s ease-in-out infinite",
                      transformOrigin: "center center",
                    }}
                  />
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-px bg-linear-to-r from-transparent via-red-400/20 to-transparent z-10"
                    style={{
                      animation: "radial-sweep 4s ease-in-out 2s infinite",
                      transformOrigin: "center center",
                    }}
                  />
                </div>
              )}

              <div className="relative w-full h-full">
                <UserStatScreen
                  background={background}
                  isActive={isItemActive}
                  kicker={
                    isGoodGuesser
                      ? "Are you a psychic?"
                      : "Better luck next time"
                  }
                  title={
                    stat.length > 1
                      ? `#${index + 1} Best Guesser`
                      : "Best Guesser"
                  }
                  user={guesser.user}
                  color={
                    isGoodGuesser
                      ? NEON_COLORS.BrightGreen
                      : NEON_COLORS.VividRed
                  }
                  stat={{
                    value: `${(guesser.accuracy * 100).toFixed(0)}%`,
                    label: "guess accuracy",
                    icon: isGoodGuesser ? "🎯" : "🎲",
                    songs: guesser.guesses
                      .sort((a, b) =>
                        a.isCorrect === b.isCorrect ? 0 : a.isCorrect ? -1 : 1
                      )
                      .map((guess) => ({
                        trackInfo: guess.trackInfo,
                        points: 0,
                        round: guess.round,
                        note: undefined,
                        leftText: guess.isCorrect ? "✓" : "✗",
                        rightText: (
                          <div className="flex gap-2">
                            <Avatar size={6} user={guess.guessedUser} />
                            /
                            <Avatar size={6} user={guess.submitter} />
                          </div>
                        ),
                        className: guess.isCorrect
                          ? "border-green-400/50 bg-green-500/10"
                          : "border-red-400/50 bg-red-500/10",
                      })),
                  }}
                  noDataMessage="No voting data available"
                />
              </div>
            </>
          );
        }}
      />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes target-pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0.4;
          }
          50% {
            transform: translate(-50%, -50%) scale(2.8);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes dart-fly {
          0% {
            transform: translateX(-20px) translateY(10px) rotate(-10deg);
            opacity: 0;
          }
          30% {
            opacity: 0.4;
          }
          60% {
            transform: translateX(5px) translateY(-5px) rotate(2deg);
            opacity: 0.3;
          }
          100% {
            transform: translateX(-20px) translateY(10px) rotate(-10deg);
            opacity: 0;
          }
        }

        @keyframes crosshair-spin {
          0% {
            transform: rotate(0deg) scale(1);
            opacity: 0.25;
          }
          50% {
            transform: rotate(180deg) scale(1.15);
            opacity: 0.4;
          }
          100% {
            transform: rotate(360deg) scale(1);
            opacity: 0.25;
          }
        }

        @keyframes radial-sweep {
          0%,
          100% {
            transform: translate(-50%, -50%) rotate(0deg);
            opacity: 0.2;
          }
          50% {
            transform: translate(-50%, -50%) rotate(180deg);
            opacity: 0.4;
          }
        }
      `}</style>
    </Screen>
  );
}
