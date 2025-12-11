"use client";

import { twMerge } from "tailwind-merge";
import { Screen } from "../components/Screen";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import AlbumArt from "@/components/AlbumArt";
import { useMemo } from "react";

export function SummaryScreen({ playback, isActive }: PlaybackScreenProps) {
  const songs = playback.allUserTopSongs;
  const wins = playback.allUserWins;

  const playlist = useMemo(() => {
    return songs.map((song) => song.trackInfo);
  }, [songs]);

  if (!songs || songs.length === 0) {
    return (
      <Screen background={{ from: "#1e1b4b", via: "#7c3aed", to: "#000000" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No song data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#1e1b4b", via: "#7c3aed", to: "#000000" }}>
      <div className="h-full flex items-center p-8 text-white relative overflow-hidden">
        {/* Floating decorative elements in background */}
        {isActive && (
          <>
            {/* Trophy elements */}
            <div
              className="absolute top-[5%] left-[8%] text-5xl opacity-15 z-0"
              style={{
                animation: "gentle-float 6s ease-in-out infinite",
              }}
            >
              🏆
            </div>
            <div
              className="absolute bottom-[10%] right-[10%] text-4xl opacity-20 z-0"
              style={{
                animation: "gentle-float 5.5s ease-in-out 1s infinite",
              }}
            >
              🏆
            </div>

            {/* Star elements */}
            <div
              className="absolute top-[20%] right-[5%] text-4xl opacity-15 z-0"
              style={{
                animation: "gentle-rotate 8s linear infinite",
              }}
            >
              ⭐
            </div>
            <div
              className="absolute top-[60%] left-[5%] text-5xl opacity-20 z-0"
              style={{
                animation: "gentle-rotate 7s linear 2s infinite",
              }}
            >
              ⭐
            </div>
            <div
              className="absolute bottom-[25%] left-[12%] text-3xl opacity-15 z-0"
              style={{
                animation: "gentle-rotate 9s linear 4s infinite",
              }}
            >
              ⭐
            </div>

            {/* Musical notes */}
            <div
              className="absolute top-[40%] right-[8%] text-4xl opacity-15 z-0"
              style={{
                animation: "gentle-float 7s ease-in-out 2s infinite",
              }}
            >
              🎵
            </div>
            <div
              className="absolute bottom-[40%] right-[15%] text-3xl opacity-20 z-0"
              style={{
                animation: "gentle-float 6.5s ease-in-out 3s infinite",
              }}
            >
              🎶
            </div>
          </>
        )}

        <div className="w-full flex flex-col gap-4 max-h-full pb-8 relative z-10">
          {/* Title */}
          <div
            className={twMerge(
              "transition-all duration-700 transform",
              isActive
                ? "opacity-100 delay-0 translate-y-0"
                : "opacity-0 -translate-y-4"
            )}
          >
            <h2 className="text-center drop-shadow-lg">League Summary</h2>
          </div>

          {/* Scrollable Content */}
          <div
            className={twMerge(
              "flex-1 overflow-y-auto transition-all duration-500",
              isActive ? "opacity-100 delay-200" : "opacity-0"
            )}
          >
            <div className="space-y-8 pb-4">
              {/* Top Songs Section */}
              <div>
                <h3
                  className="text-2xl text-purple-300 text-center mb-4 drop-shadow-md"
                  style={{
                    animation: isActive
                      ? "fade-in-scale 0.6s ease-out 0.3s both"
                      : "none",
                  }}
                >
                  Top Songs
                </h3>
                <div className="space-y-3">
                  {songs.map((song, index) => (
                    <div
                      key={song.trackInfo.trackId}
                      className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 transform transition-all duration-300"
                      style={{
                        animation: isActive
                          ? `slide-in-from-left 0.5s ease-out ${
                              index * 80 + 400
                            }ms both`
                          : "none",
                      }}
                    >
                      <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4">
                        {/* Rank with medal/trophy for top 3 */}
                        <div
                          className="text-3xl font-bold text-purple-300 w-12 text-center"
                          style={{
                            animation: isActive
                              ? `rank-pop 0.4s ease-out ${
                                  index * 80 + 500
                                }ms both`
                              : "none",
                          }}
                        >
                          {index === 0 ? (
                            <span className="text-4xl">🥇</span>
                          ) : index === 1 ? (
                            <span className="text-4xl">🥈</span>
                          ) : index === 2 ? (
                            <span className="text-4xl">🥉</span>
                          ) : (
                            `#${index + 1}`
                          )}
                        </div>

                        {/* Album Art */}
                        <div
                          className="shrink-0"
                          style={{
                            animation: isActive
                              ? `album-spin-in 0.5s ease-out ${
                                  index * 80 + 550
                                }ms both`
                              : "none",
                          }}
                        >
                          <AlbumArt
                            trackInfo={song.trackInfo}
                            size={56}
                            round={song.round}
                            playlist={playlist}
                          />
                        </div>

                        {/* Song and User Info */}
                        <div className="overflow-hidden">
                          <p className="text-lg font-semibold truncate drop-shadow-md">
                            {song.trackInfo.title}
                          </p>
                          <p className="text-sm text-purple-200 truncate">
                            {song.trackInfo.artists.join(", ")}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar
                              user={song.user}
                              size={6}
                              includeLink={false}
                            />
                            <p className="text-xs text-purple-300">
                              {song.user.userName}
                            </p>
                          </div>
                        </div>

                        {/* Points */}
                        <div
                          className="text-right"
                          style={{
                            animation: isActive
                              ? `points-bounce 0.4s ease-out ${
                                  index * 80 + 600
                                }ms both`
                              : "none",
                          }}
                        >
                          <p className="text-2xl font-bold text-green-400 drop-shadow-md">
                            {song.points}
                          </p>
                          <p className="text-xs text-purple-300">
                            {song.voters}{" "}
                            {song.voters === 1 ? "voter" : "voters"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Wins Section */}
              <div>
                <h3
                  className="text-2xl text-purple-300 text-center mb-4 drop-shadow-md"
                  style={{
                    animation: isActive
                      ? `fade-in-scale 0.6s ease-out ${
                          songs.length * 80 + 800
                        }ms both`
                      : "none",
                  }}
                >
                  Most Wins
                </h3>
                <div className="space-y-3">
                  {wins.map((userWin, index) => {
                    const isSameAsOther = (() => {
                      const before = wins[index - 1];
                      const after = wins[index + 1];

                      if (before && before.wins === userWin.wins) {
                        return true;
                      }
                      if (after && after.wins === userWin.wins) {
                        return true;
                      }
                      return false;
                    })();

                    const animationDelay = songs.length * 80 + 900 + index * 80;

                    return (
                      <div
                        key={userWin.user._id}
                        className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 transform transition-all duration-300"
                        style={{
                          animation: isActive
                            ? `slide-in-from-right 0.5s ease-out ${animationDelay}ms both`
                            : "none",
                        }}
                      >
                        <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4">
                          {/* Rank */}
                          <div
                            className="text-3xl font-bold text-purple-300 w-12 text-center"
                            style={{
                              animation: isActive
                                ? `rank-pop 0.4s ease-out ${
                                    animationDelay + 100
                                  }ms both`
                                : "none",
                            }}
                          >
                            #{index + 1}
                          </div>

                          {/* Avatar */}
                          <div
                            style={{
                              animation: isActive
                                ? `avatar-zoom 0.4s ease-out ${
                                    animationDelay + 150
                                  }ms both`
                                : "none",
                            }}
                          >
                            <Avatar
                              user={userWin.user}
                              size={12}
                              includeLink={false}
                            />
                          </div>

                          {/* User Info */}
                          <div className="overflow-hidden">
                            <p className="text-lg font-semibold truncate drop-shadow-md">
                              {userWin.user.userName}
                            </p>
                          </div>

                          {/* Wins */}
                          <div
                            className="text-right"
                            style={{
                              animation: isActive
                                ? `points-bounce 0.4s ease-out ${
                                    animationDelay + 200
                                  }ms both`
                                : "none",
                            }}
                          >
                            <p className="text-2xl font-bold text-yellow-400 drop-shadow-md">
                              {userWin.wins}
                            </p>
                            <p className="text-xs text-purple-300">
                              {userWin.wins === 1 ? "win" : "wins"}
                            </p>
                            {isSameAsOther && (
                              <p className="text-xs text-purple-200 mt-1">
                                {userWin.totalPoints} pts
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom animations */}
        <style jsx>{`
          @keyframes gentle-float {
            0%,
            100% {
              transform: translateY(0) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(5deg);
            }
          }

          @keyframes gentle-rotate {
            0% {
              transform: rotate(0deg) scale(1);
            }
            50% {
              transform: rotate(180deg) scale(1.1);
            }
            100% {
              transform: rotate(360deg) scale(1);
            }
          }

          @keyframes fade-in-scale {
            0% {
              opacity: 0;
              transform: scale(0.9);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes slide-in-from-left {
            0% {
              opacity: 0;
              transform: translateX(-50px);
            }
            60% {
              transform: translateX(5px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes slide-in-from-right {
            0% {
              opacity: 0;
              transform: translateX(50px);
            }
            60% {
              transform: translateX(-5px);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes rank-pop {
            0% {
              opacity: 0;
              transform: scale(0) rotate(-90deg);
            }
            60% {
              transform: scale(1.2) rotate(10deg);
            }
            100% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }

          @keyframes album-spin-in {
            0% {
              opacity: 0;
              transform: scale(0.3) rotate(-180deg);
            }
            70% {
              transform: scale(1.05) rotate(10deg);
            }
            100% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }

          @keyframes points-bounce {
            0% {
              opacity: 0;
              transform: scale(0) translateY(20px);
            }
            60% {
              transform: scale(1.2) translateY(-5px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          @keyframes avatar-zoom {
            0% {
              opacity: 0;
              transform: scale(0);
            }
            60% {
              transform: scale(1.15);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    </Screen>
  );
}
