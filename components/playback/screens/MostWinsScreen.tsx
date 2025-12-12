"use client";

import { Screen } from "../components/Screen";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { UserStatScreen } from "./UserStatScreen";
import { HorizontalCarousel } from "../components/HorizontalCarousel";

export function MostWinsScreen({ playback, isActive }: PlaybackScreenProps) {
  const stat = playback.mostWinsUsers;

  if (stat.length === 0) {
    return (
      <Screen background={{ from: "#8b5cf6", via: "#06b6d4", to: "#ef4444" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No wins data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="h-full w-full relative overflow-hidden">
        <HorizontalCarousel
          items={stat}
          isActive={isActive}
          renderItem={(winner, index, isItemActive) => (
            <>
              {/* Animated trophy background - only for first place */}
              {index === 0 && isItemActive && isActive && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl opacity-10 transition-all duration-1000 transform z-10 animate-[float-trophy_6s_ease-in-out_infinite]">
                  🏆
                </div>
              )}

              {/* Confetti elements - only for first place */}
              {index === 0 && isItemActive && isActive && (
                <>
                  <div
                    className="absolute -top-20 left-1/4 text-5xl pointer-events-none z-10"
                    style={{ animation: "fall-confetti 4s linear infinite" }}
                  >
                    🎉
                  </div>
                  <div
                    className="absolute -top-20 right-1/4 text-5xl z-10 pointer-events-none"
                    style={{
                      animation: "fall-confetti 4.5s linear 0.5s infinite",
                    }}
                  >
                    ✨
                  </div>
                  <div
                    className="absolute -top-20 left-1/3 text-4xl z-10 pointer-events-none"
                    style={{
                      animation: "fall-confetti 5s linear 1s infinite",
                    }}
                  >
                    🎊
                  </div>
                  <div
                    className="absolute -top-20 right-1/3 text-4xl z-10 pointer-events-none"
                    style={{
                      animation: "fall-confetti 4.8s linear 1.5s infinite",
                    }}
                  >
                    ⭐
                  </div>
                  <div
                    className="absolute -top-20 left-1/2 text-5xl z-10 pointer-events-none"
                    style={{
                      animation: "fall-confetti 4.2s linear 2s infinite",
                    }}
                  >
                    🎊
                  </div>
                  <div
                    className="absolute -top-20 left-[15%] text-4xl z-10 pointer-events-none"
                    style={{
                      animation: "fall-confetti 4.6s linear 2.5s infinite",
                    }}
                  >
                    🎉
                  </div>
                </>
              )}
              <UserStatScreen
                isActive={isItemActive}
                kicker="Impressive!"
                autoSelectFirstSong
                title={`#${index + 1} Most 1st Place Wins`}
                user={winner.user}
                strokeColor={NEON_COLORS.BrightBlue}
                stat={{
                  value: winner.wins.length,
                  label: winner.wins.length === 1 ? "win" : "wins",
                  icon: "🥇",
                  songs: winner.wins.map((win) => ({
                    ...win,
                    rightText: `${win.points} pts`,
                  })),
                }}
                noDataMessage="No wins data available"
              />
            </>
          )}
        />

        {/* Custom animations */}
        <style jsx>{`
          @keyframes float-trophy {
            0%,
            100% {
              transform: translate(-50%, -50%) translateY(0) rotate(0deg);
            }
            25% {
              transform: translate(-50%, -50%) translateY(-20px) rotate(-5deg);
            }
            75% {
              transform: translate(-50%, -50%) translateY(20px) rotate(5deg);
            }
          }

          @keyframes fall-confetti {
            0% {
              transform: translateY(0) translateX(0) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(110vh) translateX(var(--sway, 0))
                rotate(720deg);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </Screen>
  );
}
