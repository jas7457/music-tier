"use client";

import { twMerge } from "tailwind-merge";
import { Screen } from "../components/Screen";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { OutlinedText } from "@/components/OutlinedText";
import { NEON_COLORS } from "../constants";

export function ConspiratorsScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  if (!playback.conspirators) {
    return (
      <Screen background={{ from: "#a855f7", via: "#1e1b4b", to: "#f97316" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">
            No conspiracy data available
          </p>
        </div>
      </Screen>
    );
  }

  const { userId1, userId2, totalPoints } = playback.conspirators;
  const user1 = league.users.find((u) => u._id === userId1);
  const user2 = league.users.find((u) => u._id === userId2);

  if (!user1 || !user2) {
    return (
      <Screen background={{ from: "#a855f7", via: "#1e1b4b", to: "#f97316" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">Users not found</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#a855f7", via: "#1e1b4b", to: "#f97316" }}>
      <div className="h-full flex flex-col items-center justify-center p-8 text-white gap-8 relative overflow-hidden">
        {/* Animated mystery/conspiracy elements in background */}
        {isActive && (
          <>
            {/* Floating eyes watching */}
            <div
              className="absolute top-[8%] left-[10%] text-5xl opacity-25 z-0"
              style={{
                animation: "eye-blink 5s ease-in-out infinite",
              }}
            >
              👁️
            </div>
            <div
              className="absolute top-[15%] right-[12%] text-4xl opacity-30 z-0"
              style={{
                animation: "eye-blink 4.5s ease-in-out 1s infinite",
              }}
            >
              👁️
            </div>
            <div
              className="absolute bottom-[25%] left-[8%] text-6xl opacity-20 z-0"
              style={{
                animation: "eye-blink 5.5s ease-in-out 2s infinite",
              }}
            >
              👁️
            </div>
            <div
              className="absolute bottom-[15%] right-[15%] text-5xl opacity-25 z-0"
              style={{
                animation: "eye-blink 4.8s ease-in-out 0.5s infinite",
              }}
            >
              👁️
            </div>

            {/* Mysterious sparkles/stars */}
            <div
              className="absolute top-[30%] left-[20%] text-3xl opacity-40 z-0"
              style={{
                animation: "sparkle-twinkle 3s ease-in-out infinite",
              }}
            >
              ✨
            </div>
            <div
              className="absolute top-[70%] right-[25%] text-4xl opacity-35 z-0"
              style={{
                animation: "sparkle-twinkle 3.5s ease-in-out 0.8s infinite",
              }}
            >
              ✨
            </div>
            <div
              className="absolute top-[45%] right-[10%] text-3xl opacity-30 z-0"
              style={{
                animation: "sparkle-twinkle 3.2s ease-in-out 1.5s infinite",
              }}
            >
              ⭐
            </div>
            <div
              className="absolute bottom-[40%] left-[15%] text-4xl opacity-35 z-0"
              style={{
                animation: "sparkle-twinkle 3.8s ease-in-out 2.2s infinite",
              }}
            >
              ⭐
            </div>

            {/* Question marks floating around */}
            <div
              className="absolute top-[20%] right-[20%] text-4xl opacity-20 z-0"
              style={{
                animation: "float-spin 6s ease-in-out infinite",
              }}
            >
              ❓
            </div>
            <div
              className="absolute bottom-[30%] right-[8%] text-5xl opacity-25 z-0"
              style={{
                animation: "float-spin 5.5s ease-in-out 1.5s infinite",
              }}
            >
              ❓
            </div>
            <div
              className="absolute top-[50%] left-[5%] text-4xl opacity-20 z-0"
              style={{
                animation: "float-spin 6.5s ease-in-out 3s infinite",
              }}
            >
              ❓
            </div>
          </>
        )}

        <div
          className={twMerge(
            "transition-all duration-700 transform relative z-10",
            isActive ? "opacity-100 delay-0 scale-100" : "opacity-0 scale-95"
          )}
        >
          <h2 className="text-center drop-shadow-lg">
            You two be working together
          </h2>
          <p className="text-4xl text-purple-300 text-center drop-shadow-lg">
            The Conspirators
          </p>
        </div>

        <div
          className={twMerge(
            "flex items-center gap-8 transition-all duration-700 relative z-10",
            isActive ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-50"
          )}
        >
          {/* User 1 with mysterious glow */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full opacity-50 z-0"
              style={{
                background: "radial-gradient(circle, #a855f7, #6366f1)",
                filter: "blur(40px)",
                animation: isActive
                  ? "pulse-mysterious 3s ease-in-out infinite"
                  : "none",
              }}
            />
            <div
              style={{
                animation: isActive
                  ? "avatar-bump-right 5s ease-in-out infinite"
                  : "none",
              }}
            >
              <Avatar
                user={user1}
                size={100}
                includeLink={false}
                isSizePercent
                className="relative z-10"
              />
            </div>
          </div>

          {/* Animated handshake with connecting line */}
          <div className="relative flex items-center gap-2">
            {/* Glowing connection line */}
            <div
              className="absolute top-1/2 left-0 right-0 h-1 -z-10"
              style={{
                background: "linear-gradient(90deg, #a855f7, #f97316)",
                animation: isActive
                  ? "pulse-line 2s ease-in-out infinite"
                  : "none",
                transform: "translateY(-50%)",
                filter: "blur(2px)",
              }}
            />
            <div
              className="text-6xl"
              style={{
                animation: isActive
                  ? "handshake-pulse 2s ease-in-out infinite"
                  : "none",
              }}
            >
              🤝
            </div>
          </div>

          {/* User 2 with mysterious glow */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full opacity-50 z-0"
              style={{
                background: "radial-gradient(circle, #f97316, #fbbf24)",
                filter: "blur(40px)",
                animation: isActive
                  ? "pulse-mysterious 3s ease-in-out 0.5s infinite"
                  : "none",
              }}
            />
            <div
              style={{
                animation: isActive
                  ? "avatar-bump-left 5s ease-in-out infinite"
                  : "none",
              }}
            >
              <Avatar
                user={user2}
                size={100}
                includeLink={false}
                isSizePercent
                className="relative z-10"
              />
            </div>
          </div>
        </div>

        <div
          className={twMerge(
            "text-center transition-all duration-700 transform relative z-10",
            isActive
              ? "opacity-100 delay-400 translate-y-0"
              : "opacity-0 translate-y-10"
          )}
        >
          <p
            className="text-2xl md:text-3xl font-bold mb-2 drop-shadow-lg"
            style={{
              animation: isActive
                ? "fade-in-bounce 0.6s ease-out 0.6s both"
                : "none",
            }}
          >
            {user1.firstName} & {user2.firstName}
          </p>
          <p
            className="text-xl text-purple-200 mb-4 drop-shadow-md"
            style={{
              animation: isActive
                ? "fade-in-bounce 0.6s ease-out 0.8s both"
                : "none",
            }}
          >
            exchanged the most points
          </p>
          <div
            style={{
              animation: isActive
                ? "points-explode 0.8s ease-out 1s both"
                : "none",
            }}
          >
            <OutlinedText
              className="text-6xl md:text-8xl font-bold"
              strokeColor={NEON_COLORS.DeepViolet}
              strokeWidth={3}
            >
              {totalPoints} points
            </OutlinedText>
          </div>
        </div>

        {/* Custom animations */}
        <style jsx>{`
          @keyframes eye-blink {
            0%,
            94%,
            100% {
              opacity: 0.25;
              transform: scaleY(1) rotate(0deg);
            }
            95%,
            97% {
              opacity: 0.1;
              transform: scaleY(0.1) rotate(5deg);
            }
            50% {
              transform: translateY(-10px) rotate(-3deg);
            }
          }

          @keyframes sparkle-twinkle {
            0%,
            100% {
              opacity: 0.2;
              transform: scale(0.8) rotate(0deg);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.3) rotate(180deg);
            }
          }

          @keyframes float-spin {
            0%,
            100% {
              transform: translateY(0) rotate(0deg);
              opacity: 0.2;
            }
            25% {
              transform: translateY(-20px) rotate(90deg);
              opacity: 0.35;
            }
            50% {
              transform: translateY(0) rotate(180deg);
              opacity: 0.2;
            }
            75% {
              transform: translateY(20px) rotate(270deg);
              opacity: 0.35;
            }
          }

          @keyframes pulse-mysterious {
            0%,
            100% {
              transform: scale(1);
              opacity: 0.3;
            }
            50% {
              transform: scale(1.3);
              opacity: 0.6;
            }
          }

          @keyframes avatar-bump-right {
            0%,
            100% {
              transform: translateX(0) rotate(0deg);
            }
            15% {
              transform: translateX(30px) rotate(8deg);
            }
            20% {
              transform: translateX(35px) rotate(10deg);
            }
            25% {
              transform: translateX(30px) rotate(8deg);
            }
            30% {
              transform: translateX(0) rotate(0deg);
            }
          }

          @keyframes avatar-bump-left {
            0%,
            100% {
              transform: translateX(0) rotate(0deg);
            }
            15% {
              transform: translateX(-30px) rotate(-8deg);
            }
            20% {
              transform: translateX(-35px) rotate(-10deg);
            }
            25% {
              transform: translateX(-30px) rotate(-8deg);
            }
            30% {
              transform: translateX(0) rotate(0deg);
            }
          }

          @keyframes handshake-pulse {
            0%,
            100% {
              transform: scale(1) rotate(0deg);
            }
            25% {
              transform: scale(1.15) rotate(-5deg);
            }
            75% {
              transform: scale(1.15) rotate(5deg);
            }
          }

          @keyframes pulse-line {
            0%,
            100% {
              opacity: 0.3;
              transform: translateY(-50%) scaleX(1);
            }
            50% {
              opacity: 0.8;
              transform: translateY(-50%) scaleX(1.05);
            }
          }

          @keyframes fade-in-bounce {
            0% {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            60% {
              transform: translateY(-5px) scale(1.02);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes points-explode {
            0% {
              opacity: 0;
              transform: scale(0.3) rotate(-15deg);
            }
            50% {
              transform: scale(1.15) rotate(5deg);
            }
            100% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }
        `}</style>
      </div>
    </Screen>
  );
}
