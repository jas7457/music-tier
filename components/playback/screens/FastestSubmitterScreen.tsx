"use client";

import { Screen } from "../components/Screen";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { formatTime } from "./utils";
import { HorizontalCarousel } from "../components/HorizontalCarousel";
import { UserStatScreen } from "./UserStatScreen";

export function FastestSubmitterScreen({
  playback,
  isActive,
}: PlaybackScreenProps) {
  const stat = playback.fastestSubmitters;

  if (stat.length === 0) {
    return (
      <Screen background={{ from: "#06b6d4", via: "#10b981", to: "#8b5cf6" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">
            No submission data available
          </p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#06b6d4", via: "#10b981", to: "#8b5cf6" }}>
      <HorizontalCarousel
        items={stat}
        isActive={isActive}
        renderItem={(submitter, index, isItemActive) => (
          <>
            {/* Speed lines/streaks in background - only for first place */}
            {index === 0 && isItemActive && isActive && (
              <>
                {/* Horizontal speed lines */}
                <div
                  className="absolute top-1/4 left-0 h-1 bg-linear-to-r from-transparent via-cyan-400 to-transparent opacity-40 z-10"
                  style={{
                    width: "100%",
                    animation: "speed-line 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  className="absolute top-1/3 left-0 h-1 bg-linear-to-r from-transparent via-green-400 to-transparent opacity-40 z-10"
                  style={{
                    width: "100%",
                    animation: "speed-line 1.8s ease-in-out 0.3s infinite",
                  }}
                />
                <div
                  className="absolute top-1/2 left-0 h-1 bg-linear-to-r from-transparent via-blue-400 to-transparent opacity-40 z-10"
                  style={{
                    width: "100%",
                    animation: "speed-line 1.6s ease-in-out 0.6s infinite",
                  }}
                />
                <div
                  className="absolute top-2/3 left-0 h-1 bg-linear-to-r from-transparent via-cyan-400 to-transparent opacity-40 z-10"
                  style={{
                    width: "100%",
                    animation: "speed-line 1.7s ease-in-out 0.9s infinite",
                  }}
                />
                <div
                  className="absolute top-3/4 left-0 h-1 bg-linear-to-r from-transparent via-green-400 to-transparent opacity-40 z-10"
                  style={{
                    width: "100%",
                    animation: "speed-line 1.9s ease-in-out 1.2s infinite",
                  }}
                />

                {/* Lightning bolt emojis */}
                <div
                  className="absolute top-[15%] right-[20%] text-6xl opacity-50 z-10"
                  style={{
                    animation: "pulse-lightning 2s ease-in-out infinite",
                  }}
                >
                  ⚡
                </div>
                <div
                  className="absolute bottom-[12%] left-[15%] text-5xl opacity-50 z-10"
                  style={{
                    animation: "pulse-lightning 2s ease-in-out 0.5s infinite",
                  }}
                >
                  ⚡
                </div>
                <div
                  className="absolute top-[60%] right-[15%] text-4xl opacity-40 z-10"
                  style={{
                    animation: "pulse-lightning 2.2s ease-in-out 1s infinite",
                  }}
                >
                  💨
                </div>
              </>
            )}

            <UserStatScreen
              isActive={isItemActive}
              kicker="You plan ahead, don't you?"
              title={
                stat.length > 1
                  ? `#${index + 1} Fastest Submitter`
                  : "Fastest Submitter"
              }
              user={submitter.user}
              strokeColor={NEON_COLORS.MintyGreen}
              autoSelectFirstSong
              stat={{
                value: formatTime(submitter.avgTime),
                icon: "⚡",
                label: "average time",
                songPrefix: (
                  <div className="text-center">Fastest submission:</div>
                ),
                songs: [
                  {
                    ...submitter.fastestSong,
                    rightText: formatTime(submitter.fastestSong.time),
                  },
                ],
              }}
              noDataMessage="No submission data available"
            />

            {/* Custom animations */}
            <style jsx>{`
              @keyframes speed-line {
                0% {
                  transform: translateX(-100%) scaleX(0.5);
                  opacity: 0;
                }
                50% {
                  opacity: 0.6;
                  transform: translateX(0%) scaleX(1);
                }
                100% {
                  transform: translateX(100%) scaleX(0.5);
                  opacity: 0;
                }
              }

              @keyframes pulse-lightning {
                0%,
                100% {
                  transform: scale(1);
                  opacity: 0.3;
                }
                50% {
                  transform: scale(1.3);
                  opacity: 0.7;
                }
              }
            `}</style>
          </>
        )}
      />
    </Screen>
  );
}
