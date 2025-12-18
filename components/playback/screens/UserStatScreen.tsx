"use client";

import { twMerge } from "tailwind-merge";
import { Avatar } from "@/components/Avatar";
import type { PopulatedUser } from "@/lib/types";
import { OutlinedText } from "@/components/OutlinedText";
import { TrackInfo } from "@/databaseTypes";
import { Songs, SongsProps } from "../components/Songs";
import { useState } from "react";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";
import { StatBounce } from "../components/Animations";
import { DualScreen } from "../components/DualScreen";

interface UserStatScreenProps {
  isActive: boolean;
  kicker: string;
  title: string;
  user: PopulatedUser | null;
  strokeColor: string;
  background: { from: string; via?: string; to: string };
  stat: {
    value: string | number;
    label: string;
    icon?: string;
    songPrefix?: React.ReactNode;
    songs?: SongsProps["songs"];
  };
  renderBackface?: (isActive: boolean) => React.ReactNode;
  noDataMessage?: string;
  className?: string;
  statClassName?: string;
}

export function UserStatScreen({
  isActive,
  kicker,
  title,
  user,
  stat,
  strokeColor,
  noDataMessage = "No data available",
  className,
  statClassName,
  renderBackface,
  background,
}: UserStatScreenProps) {
  const [currentSong, setCurrentSong] = useState<TrackInfo | null>(
    stat.songs?.[0] ? stat.songs[0].trackInfo : null
  );

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">{noDataMessage}</p>
      </div>
    );
  }

  return (
    <>
      {currentSong && (
        <AnimatedImageBackdrop imageUrl={currentSong.albumImageUrl} />
      )}
      <DualScreen
        isActive={isActive}
        backFace={
          renderBackface ??
          ((isActive) =>
            stat.songs ? (
              <div
                className={twMerge(
                  "h-full text-white py-14 px-4 relative z-10",
                  background.from,
                  background.to,
                  background.via
                )}
              >
                <div className="grid items-center h-full overflow-y-auto overflow-x-hidden">
                  <div>
                    <div className="text-center py-3 shrink-0">
                      <h2 className="text-2xl font-bold drop-shadow-lg">
                        {title}
                      </h2>
                      <p className="text-lg text-purple-200 mt-1">
                        {user.userName}
                      </p>
                    </div>

                    <Songs
                      className={twMerge(
                        "transition-all duration-700 delay-600 transform",
                        isActive
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-10"
                      )}
                      songs={stat.songs}
                      isActive={isActive}
                      onPlaySong={(song) => {
                        if (isActive) {
                          setCurrentSong(song);
                        } else {
                          setCurrentSong(null);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null)
        }
      >
        <div
          className={twMerge(
            "h-full flex items-center justify-center px-8 py-12 text-white overflow-hidden relative",
            className
          )}
          style={{
            ...(currentSong
              ? {}
              : {
                  background: `linear-gradient(135deg, ${background.from}, ${background.to})`,
                }),
          }}
        >
          <div className="w-full flex flex-col gap-6 max-h-full relative z-10">
            {/* Header with parallax effect */}
            <div
              className={twMerge(
                "transition-all duration-700 transform z-10",
                isActive ? "translate-y-0" : "-translate-y-10"
              )}
            >
              <h2 className="text-center font-bold">{kicker}</h2>
              <p className="text-4xl text-purple-300 text-center">{title}</p>
            </div>

            {/* Avatar with floating animation */}
            <div
              className={twMerge(
                "transition-all duration-700 transform flex justify-center relative mx-auto",
                isActive ? "scale-100 rotate-0 delay-400" : "scale-75 rotate-48"
              )}
              style={{
                width: "clamp(200px, 60%, 300px)",
              }}
            >
              {/* Glowing ring behind avatar */}
              <div
                className="absolute inset-0 rounded-full opacity-60 aspect-square"
                style={{
                  background: strokeColor,
                  filter: "blur(40px)",
                  animation: isActive
                    ? "pulse-glow 3s ease-in-out infinite"
                    : "none",
                }}
              />
              <div
                className="relative flex justify-center aspect-square w-full"
                style={{
                  animation: isActive
                    ? "float-avatar 4s ease-in-out infinite"
                    : "none",
                }}
              >
                <Avatar
                  user={user}
                  size={100}
                  includeLink={false}
                  isSizePercent
                />
                {/* Question mark overlay */}
                <div
                  className={twMerge(
                    "absolute inset-0 flex items-center justify-center bg-pink-600 rounded-full transition-opacity duration-700 pointer-events-none",
                    isActive ? "opacity-0" : "opacity-100"
                  )}
                  style={{
                    aspectRatio: "1",
                    transitionDelay: isActive ? "0.5s" : "0s",
                  }}
                >
                  <span className="text-6xl md:text-8xl font-bold text-white drop-shadow-2xl">
                    ?
                  </span>
                </div>
              </div>
            </div>

            {/* User name and stat with staggered entrance */}
            <div
              className={twMerge(
                "text-center transition-all duration-700 transform",
                isActive
                  ? "opacity-100 translate-y-0 delay-600"
                  : "opacity-0 translate-y-10"
              )}
            >
              <p className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xl md:text-2xl text-purple-200 mb-4">
                {stat.label}
              </p>
              <StatBounce
                isActive={isActive}
                delay={1}
                className={twMerge(
                  "text-6xl md:text-7xl font-bold wrap-break-word break-all",
                  statClassName
                )}
              >
                {stat.icon && <span className="mr-2">{stat.icon}</span>}
                <OutlinedText strokeColor={strokeColor} strokeWidth={3}>
                  {stat.value}
                </OutlinedText>
              </StatBounce>
            </div>
          </div>
        </div>

        {/* Custom animations */}
        <style jsx>{`
          @keyframes pulse-glow {
            0%,
            100% {
              transform: scale(1);
              opacity: 0.4;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.7;
            }
          }

          @keyframes float-avatar {
            0%,
            100% {
              transform: translateY(0) rotate(0deg);
            }
            25% {
              transform: translateY(-10px) rotate(2deg);
            }
            75% {
              transform: translateY(-5px) rotate(-2deg);
            }
          }
        `}</style>
      </DualScreen>
    </>
  );
}
