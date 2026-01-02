"use client";

import { useState, useRef, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { Avatar } from "@/components/Avatar";
import type { PlaybackScreenProps } from "../types";
import { Screen } from "../components/Screen";
import { DualScreen } from "../components/DualScreen";
import AlbumArt from "@/components/AlbumArt";
import { MultiLine } from "@/components/MultiLine";
import Image from "next/image";
import crownImage from "../images/crown.png";
import trumpetImage from "../images/trumpet.jpg";
import { USER_IDS } from "@/lib/utils/constants";
import { getRoundTitle } from "@/lib/utils/getRoundTitle";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";

// Crown positioning map by user ID - adjust these per user for perfect crown placement
const CROWN_POSITIONS: Record<
  string,
  { x: string; y: string; rotate: string; scale: number }
> = {
  [USER_IDS.JASON]: {
    x: "27.5%",
    y: "4%",
    rotate: "rotate(2deg)",
    scale: 0.4,
  },
  [USER_IDS.KELSEY]: {
    x: "40%",
    y: "-19%",
    rotate: "rotate(15deg)",
    scale: 1.2,
  },
  [USER_IDS.TJ]: {
    x: "31%",
    y: "-2%",
    rotate: "rotate(15deg)",
    scale: 1.4,
  },
  [USER_IDS.CODY]: {
    x: "38%",
    y: "8%",
    rotate: "rotate(0deg)",
    scale: 0.4,
  },
  [USER_IDS.DHARAM]: {
    x: "28%",
    y: "-27%",
    rotate: "rotate(5deg)",
    scale: 1.8,
  },
  [USER_IDS.KAYLA]: {
    x: "19%",
    y: "3%",
    rotate: "rotate(-2deg)",
    scale: 0.6,
  },
  [USER_IDS.JEN]: {
    x: "29%",
    y: "-15%",
    rotate: "rotate(1deg)",
    scale: 1.1,
  },
  [USER_IDS.JAMES]: {
    x: "39%",
    y: "-5%",
    rotate: "rotate(10deg)",
    scale: 0.8,
  },
  default: {
    x: "27.5%",
    y: "4%",
    rotate: "rotate(2deg)",
    scale: 0.4,
  },
};

const randomData = [...Array(20)].map(() => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  background: ["#fbbf24", "#f59e0b", "#d97706", "#ffffff"][
    Math.floor(Math.random() * 4)
  ],
  animation: `confetti-fall ${2 + Math.random() * 3}s ease-in ${
    Math.random() * 0.5
  }s infinite`,
}));

export function LeagueChampionScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  const { setVolume } = useSpotifyPlayer();
  const [revealed, setRevealed] = useState(false);
  const [crownAnimated, setCrownAnimated] = useState(false);
  const [trumpetFadingOut, setTrumpetFadingOut] = useState(false);
  const [winnerPulsing, setWinnerPulsing] = useState(false);
  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);
  const hasTriggeredAnimationRef = useRef(false);

  const winner = playback.leagueWinner;
  const otherUsers = playback.otherUsers || [];

  // Preload audio on mount
  useEffect(() => {
    const audio1 = new Audio("/audio/fanfare1.mp3");
    audio1.preload = "auto";
    audio1Ref.current = audio1;

    const audio2 = new Audio("/audio/fanfare2.mp3?v=2");
    audio2.preload = "auto";
    audio2Ref.current = audio2;
    if (isActive) {
      setVolume(0.4);
    }

    // Set up event listener to play fanfare2 when fanfare1 ends
    const handleAudio1End = () => {
      if (audio2Ref.current) {
        audio2Ref.current.currentTime = 0;
        audio2Ref.current.play().catch((error) => {
          console.error("Error playing fanfare2 audio:", error);
        });
      }
    };

    const handleAudio2End = () => {
      setVolume(1);
    };

    audio1.addEventListener("ended", handleAudio1End);
    audio2.addEventListener("ended", handleAudio2End);

    // Cleanup on unmount
    return () => {
      audio1.removeEventListener("ended", handleAudio1End);
      audio2.removeEventListener("ended", handleAudio2End);
      if (isActive) {
        setVolume(1);
      }
      if (audio1Ref.current) {
        audio1Ref.current.pause();
        audio1Ref.current.currentTime = 0;
      }
      if (audio2Ref.current) {
        audio2Ref.current.pause();
        audio2Ref.current.currentTime = 0;
      }
    };
  }, [setVolume, isActive]);

  // Handle audio playback based on isActive
  useEffect(() => {
    if (!audio1Ref.current) return;

    if (isActive) {
      // Play audio when screen becomes active (with 2s delay)
      const timeoutId = setTimeout(() => {
        if (audio1Ref.current) {
          audio1Ref.current.currentTime = 0;
          audio1Ref.current.play().catch((error) => {
            console.error("Error playing fanfare1 audio:", error);
          });
        }
      }, 2000);

      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      // Stop both audio files when screen becomes inactive
      if (audio1Ref.current) {
        audio1Ref.current.pause();
        audio1Ref.current.currentTime = 0;
      }
      if (audio2Ref.current) {
        audio2Ref.current.pause();
        audio2Ref.current.currentTime = 0;
      }
    }
  }, [isActive, setVolume]);

  // Trigger reveal animation when screen becomes active
  useEffect(() => {
    if (isActive) {
      const timeouts = [
        setTimeout(() => setRevealed(true), 1000),
        setTimeout(() => setCrownAnimated(true), 1800),
        // Crown animation: starts at 1800ms, bounces for 2000ms, moves for 800ms = finishes at 4600ms
        setTimeout(() => setTrumpetFadingOut(true), 4600), // Fade out other users when crown animation finishes
        setTimeout(() => setWinnerPulsing(true), 5600), // Start winner pulse 1s after crown finishes
      ];

      return () => timeouts.forEach(clearTimeout);
    }

    // Reset when leaving screen
    hasTriggeredAnimationRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRevealed(false);
    setCrownAnimated(false);
    setTrumpetFadingOut(false);
    setWinnerPulsing(false);
  }, [isActive]);

  if (!winner) {
    return (
      <Screen background={{ from: "#fbbf24", via: "#f59e0b", to: "#d97706" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-yellow-200">No champion data available</p>
        </div>
      </Screen>
    );
  }

  const crownPosition =
    CROWN_POSITIONS[winner.user._id] || CROWN_POSITIONS.default;

  return (
    <Screen background={{ from: "#fbbf24", via: "#f59e0b", to: "#d97706" }}>
      <DualScreen
        isActive={isActive}
        backFace={(isFlipped) => (
          <div className="h-full bg-linear-to-br from-yellow-900 via-orange-900 to-yellow-800 text-white py-14 px-4 flex flex-col gap-4">
            <h2 className="text-2xl font-bold drop-shadow-lg text-center">
              Champion&apos;s Songs
            </h2>
            <div className="flex justify-center">
              <Avatar
                className="border-2"
                user={winner.user}
                size={24}
                includeLink={false}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {winner.submissions.map((submission, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20"
                  style={{
                    animation: isFlipped
                      ? `slide-in-submission 0.4s ease-out ${index * 80}ms both`
                      : "none",
                  }}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <AlbumArt
                      trackInfo={submission.trackInfo}
                      round={submission.round}
                      size={60}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {submission.trackInfo.title}
                      </p>
                      <p className="text-xs text-white/70 truncate">
                        {submission.trackInfo.artists.join(", ")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-white/50">
                          {getRoundTitle(submission.round)}
                        </span>
                      </div>
                    </div>

                    <span className="text-sm font-bold text-yellow-300 shrink-0">
                      {submission.points} pts
                    </span>
                  </div>

                  {submission.votes.length > 0 && (
                    <div className="mt-2 space-y-1 pt-2 border-t border-white/10">
                      {submission.votes.map((vote, voteIndex) => (
                        <div
                          key={voteIndex}
                          className="text-xs bg-white/5 rounded-md p-2 grid gap-1"
                        >
                          <div className="flex gap-2 items-center">
                            <Avatar
                              user={vote.user}
                              size={8}
                              includeLink={false}
                            />
                            <p className="font-semibold text-white/80">
                              {vote.user.userName}
                            </p>
                            <span className="text-yellow-300 font-bold ml-auto">
                              {vote.points} pts
                            </span>
                          </div>

                          {vote.note && (
                            <p className="text-white/70">
                              <MultiLine>{vote.note}</MultiLine>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      >
        <div className="h-full flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
          {/* Floating confetti */}
          {revealed && (
            <>
              {randomData.map((style, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={style}
                />
              ))}
            </>
          )}

          {/* Title */}
          <div
            className={twMerge(
              "text-center mb-8 transition-all duration-1000",
              revealed
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-10"
            )}
          >
            <h2 className="text-4xl md:text-6xl font-bold drop-shadow-lg mb-2">
              {league.title}
            </h2>
            <p className="text-xl md:text-2xl text-yellow-200">
              League Champion
            </p>
          </div>

          {/* Winner reveal with crown and surrounding users */}
          <div className="flex flex-col items-center justify-center">
            {/* Relative container for avatar and surrounding users only */}
            <div className="relative flex items-center justify-center">
              {/* Other users with trumpets in circle around winner */}
              {revealed && otherUsers.length > 0 && (
                <>
                  {otherUsers.map((userData, index) => {
                    const totalUsers = otherUsers.length;
                    // Calculate position in full circle (360 degrees)
                    const angle = ((2 * Math.PI) / totalUsers) * index;

                    // The main avatar container is clamp(250px, 50vw, 400px)
                    // To keep positioning consistent across screen sizes, we use the same scaling logic
                    // Winner is 50vw (clamped 250-400px), so at different screens:
                    // - Small (50vw=250px): 1vw = 5px, so 32vw = 160px
                    // - Large (50vw=400px): 1vw = 8px, so 32vw = 256px

                    // User radius: clamp(160px, 32vw, 256px) - outer circle
                    // Trumpet radius: clamp(120px, 24vw, 192px) - 75% of user radius, between center and users

                    // Calculate positions using normalized cos/sin (range -1 to 1)
                    const cosAngle = Math.cos(angle - Math.PI / 2);
                    const sinAngle = Math.sin(angle - Math.PI / 2);

                    // Calculate if trumpet should be flipped based on which side it's on
                    const shouldFlipTrumpet = cosAngle < 0;

                    return (
                      <>
                        {/* User avatar */}
                        <div
                          key={`${userData.user._id}-avatar`}
                          className="absolute"
                          style={{
                            left: `calc(50% + clamp(160px, 32vw, 256px) * ${cosAngle})`,
                            top: `calc(50% + clamp(160px, 32vw, 256px) * ${sinAngle})`,
                            transform: "translate(-50%, -50%)",
                            animation: trumpetFadingOut
                              ? `user-fade-out 1s ease-out forwards`
                              : `user-appear 0.6s ease-out both`,
                            width: "65px",
                            height: "65px",
                          }}
                        >
                          <Avatar
                            user={userData.user}
                            size={65}
                            includeLink={false}
                          />
                        </div>

                        {/* Trumpet - positioned between user and center */}
                        <div
                          key={`${userData.user._id}-trumpet`}
                          className="absolute"
                          style={{
                            left: `calc(50% + clamp(120px, 24vw, 192px) * ${cosAngle})`,
                            top: `calc(50% + clamp(120px, 24vw, 192px) * ${sinAngle})`,
                            transform: "translate(-50%, -50%)",
                            animation: trumpetFadingOut
                              ? `user-fade-out 1s ease-out forwards`
                              : `user-appear 0.6s ease-out both`,
                            width: "60px",
                            height: "60px",
                            zIndex: 20,
                          }}
                        >
                          <Image
                            src={trumpetImage}
                            alt="Trumpet"
                            width={60}
                            height={60}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              transform: shouldFlipTrumpet
                                ? "scaleX(-1)"
                                : "none",
                              animation: revealed
                                ? "trumpet-flourish 0.6s ease-in-out infinite"
                                : "none",
                            }}
                          />
                        </div>
                      </>
                    );
                  })}
                </>
              )}

              {/* Avatar with crown (centered in its container) */}
              <div
                className={twMerge(
                  "relative transition-all duration-1000 delay-500",
                  revealed
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-50 blur-sm"
                )}
                style={{
                  width: "clamp(250px, 50vw, 400px)",
                  animation: winnerPulsing
                    ? "winner-pulse 2s ease-in-out infinite"
                    : "none",
                }}
              >
                {/* Crown */}
                {crownAnimated && (
                  <div
                    className="absolute z-10"
                    style={
                      {
                        left: "50%",
                        top: "-60%",
                        transform: "translateX(-50%)",
                        animation:
                          "crown-bounce-twice 2s cubic-bezier(0.45, 0, 0.55, 1) forwards, crown-move-to-position 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 2s forwards",
                        width: "46.67%",
                        height: "38.67%",
                        "--final-x": crownPosition.x,
                        "--final-y": crownPosition.y,
                        "--final-rotate": crownPosition.rotate,
                        "--final-scale": crownPosition.scale,
                      } as React.CSSProperties & {
                        "--final-x": string;
                        "--final-y": string;
                        "--final-rotate": string;
                        "--final-scale": number;
                      }
                    }
                  >
                    <Image
                      src={crownImage}
                      alt="Crown"
                      width={140}
                      height={116}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        animation: "crown-shine 2s ease-in-out 1.5s infinite",
                      }}
                    />
                  </div>
                )}

                <Avatar
                  className="border-8"
                  user={winner.user}
                  size={100}
                  isSizePercent
                  includeLink={false}
                />
              </div>
            </div>

            {/* Winner info - outside the relative container */}
            <div
              className={twMerge(
                "text-center mt-6 transition-all duration-1000 delay-700",
                revealed
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              )}
            >
              <p className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg">
                {winner.user.firstName} {winner.user.lastName}
              </p>
              <p className="text-xl md:text-2xl text-yellow-200">
                @{winner.user.userName}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div
            className={twMerge(
              "mt-8 w-full grid grid-cols-[1fr_1fr] transition-all duration-1000 delay-1000",
              revealed
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            )}
          >
            <div
              className="text-center"
              style={{
                animation: revealed
                  ? "stat-pulse 3s ease-in-out infinite"
                  : "none",
              }}
            >
              <p className="text-6xl md:text-7xl font-bold text-yellow-300 drop-shadow-lg">
                {winner.totalPoints}
              </p>
              <p className="text-base md:text-lg text-yellow-200 mt-2">
                Total Points
              </p>
            </div>
            <div
              className="text-center"
              style={{
                animation: revealed
                  ? "stat-pulse 3s ease-in-out 1.5s infinite"
                  : "none",
              }}
            >
              <p className="text-6xl md:text-7xl font-bold text-yellow-300 drop-shadow-lg">
                {winner.firstPlaceRounds}
              </p>
              <p className="text-base md:text-lg text-yellow-200 mt-2">
                First Place Rounds
              </p>
            </div>
          </div>
        </div>
      </DualScreen>

      {/* Animations */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes crown-bounce-twice {
          0% {
            transform: translateX(-50%) translateY(-60px);
            opacity: 0;
            animation-timing-function: ease-out;
          }
          10% {
            opacity: 1;
            animation-timing-function: ease-in;
          }
          25% {
            transform: translateX(-50%) translateY(60px);
            animation-timing-function: ease-out;
          }
          40% {
            transform: translateX(-50%) translateY(0);
            animation-timing-function: ease-in;
          }
          60% {
            transform: translateX(-50%) translateY(50px);
            animation-timing-function: ease-out;
          }
          80%,
          100% {
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes crown-move-to-position {
          0% {
            left: 50%;
            top: -60%;
            transform: translateX(-50%) translateY(0) rotate(0deg) scale(1);
          }
          100% {
            left: var(--final-x);
            top: var(--final-y);
            transform: translateX(0) translateY(0) var(--final-rotate)
              scale(var(--final-scale));
          }
        }

        @keyframes crown-shine {
          0%,
          100% {
            filter: brightness(1) drop-shadow(0 0 5px #fbbf24);
          }
          50% {
            filter: brightness(1.3) drop-shadow(0 0 15px #fbbf24);
          }
        }

        @keyframes trumpet-slide-in-left {
          0% {
            transform: translateX(-100px);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes trumpet-slide-in-right {
          0% {
            transform: translateX(100px) scaleX(-1);
            opacity: 0;
          }
          100% {
            transform: translateX(0) scaleX(-1);
            opacity: 1;
          }
        }

        @keyframes user-appear {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes user-fade-out {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
        }

        @keyframes trumpet-flourish {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          8% {
            transform: translateY(-8px) scale(1.1);
          }
          16% {
            transform: translateY(0) scale(1);
          }
          30% {
            transform: translateY(-5px) scale(1.05);
          }
          40% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-6px) scale(1.08);
          }
          60% {
            transform: translateY(0) scale(1);
          }
          70% {
            transform: translateY(-6px) scale(1.08);
          }
          80% {
            transform: translateY(0) scale(1);
          }
        }

        @keyframes stat-pulse {
          0%,
          100% {
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 8px rgba(253, 224, 71, 0.5));
          }
          50% {
            transform: scale(1.05);
            filter: brightness(1.2)
              drop-shadow(0 0 20px rgba(253, 224, 71, 0.8));
          }
        }

        @keyframes winner-pulse {
          0%,
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 15px rgba(253, 224, 71, 0.6));
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 30px rgba(253, 224, 71, 0.9));
          }
        }

        @keyframes slide-in-submission {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </Screen>
  );
}
