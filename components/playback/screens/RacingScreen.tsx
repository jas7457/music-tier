"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import type { PlaybackScreenProps } from "../types";
import { Screen } from "../components/Screen";
import { Avatar } from "@/components/Avatar";
import { getPlaces } from "@/lib/utils/getPlaces";

interface RacerPosition {
  userId: string;
  position: number; // 0 to 1, where 1 is at the bottom
  points: number;
  lane: number; // Horizontal lane (stays constant)
  rank: number; // Current rank/place (determines vertical position)
}

export function RacingScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [racerPositions, setRacerPositions] = useState<RacerPosition[]>([]);
  const previousPositionsRef = useRef<RacerPosition[]>([]);
  const swayAnimationRef = useRef<
    Record<string, { delay: number; duration: number }>
  >({});
  const [isRacing, setIsRacing] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [spinningOutUsers, setSpinningOutUsers] = useState<Set<string>>(
    new Set()
  );
  const [poweringUpUsers, setPoweringUpUsers] = useState<Set<string>>(
    new Set()
  );

  const roundPoints = playback.roundPoints;
  const users = league.users;

  // Calculate total lanes needed
  const totalLanes = users.length;

  // Function to check for anyone who dropped in rank and trigger spin outs
  const checkForRankChanges = useCallback(
    (newPositions: RacerPosition[], oldPositions: RacerPosition[]) => {
      if (oldPositions.length === 0) return;

      // Find all users who dropped in rank (rank number increased)
      const droppedUsers = newPositions
        .filter((newPos) => {
          const oldPos = oldPositions.find((op) => op.userId === newPos.userId);
          // If rank increased (went down in place), they should spin out
          return oldPos && newPos.rank > oldPos.rank;
        })
        .map((p) => p.userId);

      // Find all users who improved or maintained rank
      const improvedUsers = newPositions
        .filter((newPos) => {
          const oldPos = oldPositions.find((op) => op.userId === newPos.userId);
          // If rank decreased or stayed same (went up or stayed), they should power up
          return oldPos && newPos.rank < oldPos.rank;
        })
        .map((p) => p.userId);

      if (droppedUsers.length > 0) {
        // Add spinning effect to users who dropped
        setSpinningOutUsers(
          (prev) => new Set([...Array.from(prev), ...droppedUsers])
        );

        // Remove spinning effect after animation completes
        setTimeout(() => {
          setSpinningOutUsers((prev) => {
            const next = new Set(prev);
            droppedUsers.forEach((userId) => next.delete(userId));
            return next;
          });
        }, 1000);
      }

      if (improvedUsers.length > 0) {
        // Add power-up effect to users who improved or maintained
        setPoweringUpUsers(
          (prev) => new Set([...Array.from(prev), ...improvedUsers])
        );

        // Remove power-up effect after animation completes
        setTimeout(() => {
          setPoweringUpUsers((prev) => {
            const next = new Set(prev);
            improvedUsers.forEach((userId) => next.delete(userId));
            return next;
          });
        }, 800);
      }
    },
    []
  );

  useEffect(() => {
    if (!isActive || roundPoints.length === 0) {
      setIsRacing(false);
      setShowWinner(false);
      setRacerPositions([]);
      setCurrentRoundIndex(-1);
      setSpinningOutUsers(new Set());
      setPoweringUpUsers(new Set());
      return;
    }

    // Start the race
    setIsRacing(true);
    setShowWinner(false);
    setCurrentRoundIndex(-1); // Start at -1 for "League Start"

    // Initialize random sway animations for each user (only once)
    if (Object.keys(swayAnimationRef.current).length === 0) {
      swayAnimationRef.current = users.reduce((acc, user) => {
        acc[user._id] = {
          delay: Math.random() * 2,
          duration: 1.5 + Math.random(),
        };
        return acc;
      }, {} as Record<string, { delay: number; duration: number }>);
    }

    // Initialize positions at League Start (all at 0 points, all in 1st place)
    const initialPositions: RacerPosition[] = users.map((user, index) => ({
      userId: user._id,
      position: 0,
      points: 0,
      lane: index, // Horizontal lane stays constant
      rank: 0, // All start in 1st place (will cause most to spin out on first round)
    }));
    setRacerPositions(initialPositions);
    previousPositionsRef.current = initialPositions;

    // Animate through rounds (starting at -1 for "League Start")
    let roundIdx = -1;
    const intervalTime = 2000; // 2 seconds per round
    const leagueStartTime = 800; // Shorter time for league start

    const interval = setInterval(() => {
      if (roundIdx >= roundPoints.length) {
        clearInterval(interval);
        setIsRacing(false);
        // Show winner after a delay
        setTimeout(() => {
          setShowWinner(true);
        }, 1000);
        return;
      }

      // Skip the actual calculation for roundIdx -1 (League Start - already initialized)
      if (roundIdx === -1) {
        setCurrentRoundIndex(roundIdx);
        roundIdx++;
        // Use shorter timeout for first round after league start
        setTimeout(() => {
          if (roundIdx < roundPoints.length) {
            const currentRound = roundPoints[roundIdx];
            setCurrentRoundIndex(roundIdx);

            const userPointsMap = new Map(
              currentRound.users.map((u) => [u.user._id, u.points])
            );
            const sortedUsers = getPlaces(currentRound.users);
            const maxPoints = sortedUsers[0]?.points || 1;

            const newPositions: RacerPosition[] = users.map((user, index) => {
              const points = userPointsMap.get(user._id) || 0;
              const position = maxPoints > 0 ? points / maxPoints : 0;
              const userWithPlace = sortedUsers.find(
                (u) => u.user._id === user._id
              );
              const rank = userWithPlace ? userWithPlace.place - 1 : index;

              return {
                userId: user._id,
                position: position * 0.9,
                points,
                lane: index,
                rank: rank >= 0 ? rank : index,
              };
            });

            // Check for rank changes and trigger spin outs
            checkForRankChanges(newPositions, previousPositionsRef.current);

            previousPositionsRef.current = newPositions;
            setRacerPositions(newPositions);
            roundIdx++;
          }
        }, leagueStartTime - intervalTime);
        return;
      }

      const currentRound = roundPoints[roundIdx];
      setCurrentRoundIndex(roundIdx);

      // Calculate positions based on cumulative points
      const userPointsMap = new Map(
        currentRound.users.map((u) => [u.user._id, u.points])
      );

      // Sort users by points (descending) to determine position
      const sortedUsers = getPlaces(currentRound.users);

      // Calculate max points for normalization
      const maxPoints = sortedUsers[0]?.points || 1;

      // Update positions
      const newPositions: RacerPosition[] = users.map((user, index) => {
        const points = userPointsMap.get(user._id) || 0;
        // Position is based on points (higher points = further down)
        // Normalize to 0-1 range
        const position = maxPoints > 0 ? points / maxPoints : 0;

        // Find rank (0 = first place, 1 = second, etc.) using place from getPlaces
        const userWithPlace = sortedUsers.find((u) => u.user._id === user._id);
        const rank = userWithPlace ? userWithPlace.place - 1 : index;

        return {
          userId: user._id,
          position: position * 0.9, // Scale to 90% to leave room at bottom
          points,
          lane: index, // Keep original lane for horizontal position
          rank: rank >= 0 ? rank : index, // Rank determines vertical position
        };
      });

      // Check for rank changes and trigger spin outs
      checkForRankChanges(newPositions, previousPositionsRef.current);

      previousPositionsRef.current = newPositions;
      setRacerPositions(newPositions);
      roundIdx++;
    }, intervalTime);

    return () => {
      clearInterval(interval);
    };
  }, [isActive, roundPoints, users, checkForRankChanges]);

  if (roundPoints.length === 0) {
    return (
      <Screen>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No racing data available</p>
        </div>
      </Screen>
    );
  }

  const currentRound =
    currentRoundIndex >= 0 ? roundPoints[currentRoundIndex] : null;
  const winner = playback.leagueWinner;

  return (
    <Screen background={{ from: "#0f172a", via: "#1e293b", to: "#0f172a" }}>
      <div className="h-full w-full relative flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-6 bg-linear-to-b from-black/50 to-transparent">
          <div
            className={twMerge(
              "text-center transition-all duration-500",
              isActive
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-4"
            )}
          >
            <h2 className="text-4xl font-bold text-white mb-2">
              🏁 League Race 🏁
            </h2>
            {isRacing && currentRoundIndex === -1 && (
              <p className="text-xl text-purple-300">League Start</p>
            )}
            {isRacing && currentRound && (
              <p className="text-xl text-purple-300 truncate">
                Round {currentRound.round.roundIndex + 1}:{" "}
                {currentRound.round.title}
              </p>
            )}
            {showWinner && winner && (
              <p className="text-2xl text-yellow-300 font-bold animate-pulse">
                🏆 Champion: {winner.user.userName} 🏆
              </p>
            )}
          </div>
        </div>

        {/* Racing lanes */}
        <div className="flex-1 relative w-full px-8 py-24">
          {/* Start line */}
          <div className="absolute top-24 left-0 right-0 h-1 bg-linear-to-r from-transparent via-green-400 to-transparent" />

          {/* Finish line */}
          <div className="absolute bottom-4 left-0 right-0 h-2 bg-linear-to-r from-transparent via-yellow-400 to-transparent">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.3)_10px,rgba(0,0,0,0.3)_20px)]" />
          </div>

          {/* Racers */}
          {racerPositions.map((racer) => {
            const user = users.find((u) => u._id === racer.userId);
            if (!user) return null;

            // Add padding to lanes to prevent cutoff (10% padding on each side)
            const paddingPercent = 5;
            const usableWidth = 100 - paddingPercent * 2;
            const laneWidth = usableWidth / totalLanes;
            const leftPosition =
              paddingPercent + racer.lane * laneWidth + laneWidth / 2;

            // Check if we're at the start (all users have rank 0)
            const allAtStart = racerPositions.every((r) => r.rank === 0);

            let topPosition;
            if (allAtStart) {
              // At league start, everyone is at the top (start line)
              topPosition = 18; // Position at the start line
            } else {
              // First place (rank 0) should be further down
              // Invert the position so lower rank = further down
              const invertedPosition = 1 - racer.rank / (totalLanes - 1 || 1);
              topPosition = 15 + invertedPosition * 60; // 15% from top, max 75% to avoid bottom overlap
            }

            const isSpinningOut = spinningOutUsers.has(racer.userId);
            const isPoweringUp = poweringUpUsers.has(racer.userId);

            // Get the stored random animation values for this racer
            const swayAnimation = swayAnimationRef.current[racer.userId] || {
              delay: 0,
              duration: 2,
            };

            return (
              <div
                key={racer.userId}
                className={twMerge(
                  "absolute transition-all duration-1500 ease-in-out animate-driving-sway",
                  isSpinningOut && "animate-spin-out"
                )}
                style={
                  {
                    left: `${leftPosition}%`,
                    top: `${topPosition}%`,
                    transform: "translate(-50%, -50%)",
                    animationDelay: `${swayAnimation.delay}s`,
                    animationDuration: `${swayAnimation.duration}s`,
                  } as React.CSSProperties
                }
              >
                <div className="flex flex-col items-center">
                  <div
                    className={twMerge(
                      "relative w-[16vw] max-w-24 aspect-square",
                      isPoweringUp && "animate-power-up"
                    )}
                  >
                    <Avatar
                      user={user}
                      size={96}
                      includeLink={false}
                      className={twMerge(
                        "border-2 shadow-lg transition-all w-full! h-full!",
                        showWinner && winner?.user._id === user._id
                          ? "border-yellow-400 shadow-yellow-400/50 scale-125"
                          : "border-white/50"
                      )}
                    />
                    {/* Points badge */}
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-linear-to-r from-purple-600 to-pink-600 text-white text-[1.2rem] font-bold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap">
                      {racer.points}
                    </div>
                  </div>

                  {/* User name */}
                  <div className="mt-1 text-white text-xs font-semibold text-center w-[10vw] max-w-16 truncate">
                    {user.userName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom info */}
        {showWinner && winner && (
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 bg-linear-to-t from-black/70 to-transparent">
            <div className="text-center animate-fade-in">
              <p className="text-3xl font-bold text-yellow-400 mb-2">
                🎉 League Champion! 🎉
              </p>
              <p className="text-xl text-white">
                {winner.user.userName} - {winner.totalPoints} points
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        @keyframes spin-out {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) scale(1);
          }
          25% {
            transform: translate(-50%, -50%) rotate(180deg) scale(0.8);
          }
          50% {
            transform: translate(-50%, -50%) rotate(360deg) scale(0.9);
          }
          75% {
            transform: translate(-50%, -50%) rotate(540deg) scale(0.8);
          }
          100% {
            transform: translate(-50%, -50%) rotate(720deg) scale(1);
          }
        }
        .animate-spin-out {
          animation: spin-out 1s ease-in-out !important;
          filter: blur(2px);
        }

        @keyframes driving-sway {
          0% {
            transform: translate(-50%, -50%) translateX(0);
          }
          25% {
            transform: translate(-50%, -50%) translateX(8px);
          }
          50% {
            transform: translate(-50%, -50%) translateX(0);
          }
          75% {
            transform: translate(-50%, -50%) translateX(-8px);
          }
          100% {
            transform: translate(-50%, -50%) translateX(0);
          }
        }
        .animate-driving-sway {
          animation: driving-sway 2s ease-in-out infinite;
        }

        @keyframes power-up {
          0% {
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 0 rgba(255, 215, 0, 0));
          }
          30% {
            transform: scale(1.3);
            filter: brightness(1.3) drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))
              drop-shadow(0 0 40px rgba(255, 215, 0, 0.4));
          }
          50% {
            transform: scale(1.2);
            filter: brightness(1.25)
              drop-shadow(0 0 15px rgba(255, 215, 0, 0.7))
              drop-shadow(0 0 30px rgba(255, 215, 0, 0.3));
          }
          70% {
            transform: scale(1.3);
            filter: brightness(1.3) drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))
              drop-shadow(0 0 40px rgba(255, 215, 0, 0.4));
          }
          100% {
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 0 rgba(255, 215, 0, 0));
          }
        }
        .animate-power-up {
          animation: power-up 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </Screen>
  );
}
