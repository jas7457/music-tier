"use client";

import { Screen } from "../components/Screen";
import type { PlaybackScreenProps } from "../types";
import { NEON_COLORS } from "../constants";
import { HorizontalCarousel } from "../components/HorizontalCarousel";
import { UserStatScreen } from "./UserStatScreen";

export function MostConsistentScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  if (!playback.mostConsistent || playback.mostConsistent.length === 0) {
    return (
      <Screen background={{ from: "#ec4899", via: "#f97316", to: "#a855f7" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-pink-300">
            No consistency data available
          </p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#ec4899", via: "#f97316", to: "#a855f7" }}>
      <HorizontalCarousel
        isActive={isActive}
        items={playback.mostConsistent}
        renderItem={(consistent, index, isItemActive) => {
          return (
            <>
              {/* Animated background elements - metronome/rhythm theme */}
              {index === 0 && isItemActive && (
                <>
                  {/* Pulsing circles radiating outward - consistency waves */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-pink-400/30"
                    style={{
                      animation: "pulse-ring 3s ease-in-out infinite",
                    }}
                  />
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-orange-400/30"
                    style={{
                      animation: "pulse-ring 3s ease-in-out 1s infinite",
                    }}
                  />
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 border-purple-400/30"
                    style={{
                      animation: "pulse-ring 3s ease-in-out 2s infinite",
                    }}
                  />

                  {/* Floating metronome/pendulum indicators */}
                  <div
                    className="absolute top-[15%] left-[12%] text-4xl opacity-30"
                    style={{
                      animation: "metronome-swing 2s ease-in-out infinite",
                    }}
                  >
                    ⏱️
                  </div>
                  <div
                    className="absolute top-[20%] right-[15%] text-3xl opacity-25"
                    style={{
                      animation: "metronome-swing 2s ease-in-out 0.5s infinite",
                    }}
                  >
                    ⏱️
                  </div>
                  <div
                    className="absolute bottom-[20%] left-[10%] text-5xl opacity-20"
                    style={{
                      animation: "metronome-swing 2s ease-in-out 1s infinite",
                    }}
                  >
                    ⏱️
                  </div>

                  {/* Floating checkmarks - consistency marks */}
                  <div
                    className="absolute top-[35%] right-[8%] text-4xl opacity-25"
                    style={{
                      animation: "check-bounce 2.5s ease-in-out infinite",
                    }}
                  >
                    ✓
                  </div>
                  <div
                    className="absolute bottom-[35%] left-[15%] text-3xl opacity-30"
                    style={{
                      animation: "check-bounce 2.5s ease-in-out 1.2s infinite",
                    }}
                  >
                    ✓
                  </div>
                  <div
                    className="absolute top-[55%] left-[8%] text-4xl opacity-20"
                    style={{
                      animation: "check-bounce 2.5s ease-in-out 0.8s infinite",
                    }}
                  >
                    ✓
                  </div>
                  <div
                    className="absolute bottom-[50%] right-[12%] text-3xl opacity-25"
                    style={{
                      animation: "check-bounce 2.5s ease-in-out 1.8s infinite",
                    }}
                  >
                    ✓
                  </div>

                  {/* Horizontal lines representing consistency/stability */}
                  <div
                    className="absolute top-[25%] left-0 w-full h-0.5 bg-linear-to-r from-transparent via-pink-400/20 to-transparent"
                    style={{
                      animation: "line-slide 4s ease-in-out infinite",
                    }}
                  />
                  <div
                    className="absolute top-[75%] left-0 w-full h-0.5 bg-linear-to-r from-transparent via-orange-400/20 to-transparent"
                    style={{
                      animation: "line-slide 4s ease-in-out 2s infinite",
                    }}
                  />
                </>
              )}

              <UserStatScreen
                isActive={isItemActive}
                kicker="Steady as she goes!"
                title={`#${index + 1} Most Consistent`}
                user={consistent.user}
                strokeColor={NEON_COLORS.LimeGreen}
                statClassName="text-5xl"
                stat={{
                  value: `± ${consistent.variance.toFixed(1)} variance`,
                  label: `Averaged ${consistent.avgPoints.toFixed(
                    1
                  )} pts/round`,
                  icon: "",
                  songs: consistent.rounds.map((round) => ({
                    trackInfo: round.submission.trackInfo,
                    round: round.round,
                    rightText: `${round.points} pts`,
                    note: round.submission.note,
                  })),
                }}
              />
            </>
          );
        }}
      />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
          }
        }

        @keyframes metronome-swing {
          0%,
          100% {
            transform: rotate(-15deg);
            opacity: 0.2;
          }
          50% {
            transform: rotate(15deg);
            opacity: 0.4;
          }
        }

        @keyframes check-bounce {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.25;
          }
          50% {
            transform: translateY(-10px) scale(1.1);
            opacity: 0.4;
          }
        }

        @keyframes line-slide {
          0%,
          100% {
            opacity: 0.1;
            transform: translateX(-10%);
          }
          50% {
            opacity: 0.3;
            transform: translateX(10%);
          }
        }
      `}</style>
    </Screen>
  );
}
