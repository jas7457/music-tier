"use client";

import { twMerge } from "tailwind-merge";
import { Avatar } from "@/components/Avatar";
import type { PopulatedUser } from "@/lib/types";
import { DataText } from "@/components/DataText";
import { TrackInfo } from "@/databaseTypes";
import { Songs, SongsProps } from "../components/Songs";
import { useState } from "react";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";
import { StatBounce } from "../components/Animations";
import { DualScreen } from "../components/DualScreen";

import codyImage from "../images/codyfinal.jpg";
import dharamImage from "../images/dharamfinal.png";
import jamesImage from "../images/jamesfinal.jpg";
import jasonImage from "../images/jasonfinal.jpg";
import jenImage from "../images/jenfinal.jpg";
import kaylaImage from "../images/kaylafinal.jpg";
import kelseyImage from "../images/kelseyfinal.jpg";
import tjImage from "../images/tjfinal.jpg";
import { USER_IDS } from "@/lib/utils/constants";

interface UserStatScreenProps {
  isActive: boolean;
  kicker: string;
  title: string;
  user: PopulatedUser | null;
  color: string;
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
  color,
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

  const backfaceImage =
    {
      [USER_IDS.CODY]: codyImage.src,
      [USER_IDS.DHARAM]: dharamImage.src,
      [USER_IDS.JAMES]: jamesImage.src,
      [USER_IDS.JASON]: jasonImage.src,
      [USER_IDS.JEN]: jenImage.src,
      [USER_IDS.KAYLA]: kaylaImage.src,
      [USER_IDS.KELSEY]: kelseyImage.src,
      [USER_IDS.TJ]: tjImage.src,
    }[user._id] || user.photoUrl;

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
                  background: color,
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
                {/* 3D container for flip animation */}
                <div
                  className="w-full h-full"
                  style={{
                    perspective: "1200px",
                    perspectiveOrigin: "center center",
                  }}
                >
                  <div
                    className="relative w-full h-full"
                    style={{
                      animation: isActive
                        ? "avatar-3d-spin-with-flip 21s ease-in-out infinite"
                        : "none",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {/* Front face - Avatar */}
                    <div
                      className="absolute inset-0"
                      style={{
                        transform: "translateZ(0) rotateY(0deg)",
                        backfaceVisibility: "hidden",
                      }}
                    >
                      <Avatar
                        user={user}
                        size={100}
                        includeLink={false}
                        isSizePercent
                      />
                    </div>

                    {/* Back face - Image */}
                    <div
                      className="absolute inset-0 rounded-full overflow-hidden"
                      style={{
                        transform:
                          "translateZ(0) rotateY(180deg) rotate(180deg)",
                        backfaceVisibility: "hidden",
                      }}
                    >
                      <div className="h-full w-full grid items-center justify-items-center">
                        <img
                          alt=""
                          src={backfaceImage}
                          className="w-full h-full aspect-square object-cover border-2 rounded-full border-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

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
                <DataText color={color}>{stat.value}</DataText>
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

          @keyframes avatar-3d-spin-with-flip {
            /* First 5 seconds: normal subtle 3D rotation on front face */
            0% {
              transform: rotateY(-15deg) rotateX(5deg) rotateZ(0deg);
            }
            9.5% {
              transform: rotateY(0deg) rotateX(10deg) rotateZ(2deg);
            }
            19% {
              transform: rotateY(15deg) rotateX(5deg) rotateZ(0deg);
            }
            23.8% {
              transform: rotateY(0deg) rotateX(0deg) rotateZ(0deg);
            }

            /* Twirl to backface (1 full spin + 180deg) = 540deg to show back */
            28.5% {
              transform: rotateY(540deg) rotateX(0deg) rotateZ(180deg);
            }

            /* Backface showing: subtle 3D rotation for 5 seconds (around 540deg = 180deg equivalent) */
            33.3% {
              transform: rotateY(525deg) rotateX(5deg) rotateZ(180deg);
            }
            38.1% {
              transform: rotateY(540deg) rotateX(10deg) rotateZ(182deg);
            }
            42.9% {
              transform: rotateY(555deg) rotateX(5deg) rotateZ(180deg);
            }
            47.6% {
              transform: rotateY(540deg) rotateX(0deg) rotateZ(180deg);
            }

            /* Twirl back to front in REVERSE (subtract 540deg) = back to 0deg */
            52.4% {
              transform: rotateY(0deg) rotateX(0deg) rotateZ(0deg);
            }

            /* Front face: back to starting subtle rotations */
            57.1% {
              transform: rotateY(-15deg) rotateX(-5deg) rotateZ(-2deg);
            }
            66.7% {
              transform: rotateY(0deg) rotateX(-10deg) rotateZ(0deg);
            }
            76.2% {
              transform: rotateY(15deg) rotateX(-5deg) rotateZ(2deg);
            }
            85.7% {
              transform: rotateY(15deg) rotateX(0deg) rotateZ(0deg);
            }
            95.2% {
              transform: rotateY(10deg) rotateX(8deg) rotateZ(-2deg);
            }
            100% {
              transform: rotateY(-15deg) rotateX(5deg) rotateZ(0deg);
            }
          }
        `}</style>
      </DualScreen>
    </>
  );
}
