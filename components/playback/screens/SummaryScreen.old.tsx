"use client";

import { Screen } from "../components/Screen";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { HorizontalCarousel } from "../components/HorizontalCarousel";
import { NEON_COLORS } from "../constants";
import { useMemo } from "react";

export function SummaryScreen({ playback, isActive }: PlaybackScreenProps) {
  const summaryCards = useMemo(() => {
    const cards = [];

    // Card 1: Total Rounds Played
    if (playback.userStats) {
      cards.push({
        id: "total-rounds",
        icon: "🎵",
        title: "Rounds Played",
        value: playback.userStats.rounds.toString(),
        subtitle: "total rounds",
        color: NEON_COLORS.ElectricBlue,
        stats: [
          {
            label: "Total Songs",
            value: playback.userStats.submissions.toString(),
          },
          {
            label: "Total Votes Cast",
            value: playback.userStats.votes.toString(),
          },
        ],
      });
    }

    // Card 2: Your Total Points
    if (playback.userStats) {
      const avgPoints =
        playback.userStats.rounds > 0
          ? (playback.userStats.points / playback.userStats.rounds).toFixed(1)
          : "0";
      cards.push({
        id: "your-points",
        icon: "⭐",
        title: "Your Points",
        value: playback.userStats.points.toString(),
        subtitle: "total points earned",
        color: NEON_COLORS.NeonYellow,
        stats: [
          { label: "Avg Per Round", value: avgPoints },
          {
            label: "Best Round",
            value: playback.userStats.bestRound?.points.toString() || "0",
          },
        ],
      });
    }

    // Card 3: League Champion (Most Wins)
    if (playback.allUserWins.length > 0) {
      const champion = playback.allUserWins[0];
      cards.push({
        id: "champion",
        icon: "👑",
        title: "League Champion",
        user: champion.user,
        value: champion.wins.toString(),
        subtitle: champion.wins === 1 ? "win" : "wins",
        color: NEON_COLORS.BrightGold,
        stats: [
          { label: "Total Points", value: champion.totalPoints.toString() },
        ],
      });
    }

    // Card 4: Highest Scoring Song
    if (playback.allUserTopSongs.length > 0) {
      const topSong = playback.allUserTopSongs[0];
      cards.push({
        id: "top-song",
        icon: "🔥",
        title: "Highest Scoring Song",
        user: topSong.user,
        value: topSong.points.toString(),
        subtitle: "points",
        color: NEON_COLORS.HotPink,
        trackInfo: topSong.trackInfo,
        stats: [
          { label: "Voters", value: topSong.voters.toString() },
          { label: "Round", value: topSong.round.title },
        ],
      });
    }

    // Card 5: Most Consistent Player
    if (playback.mostConsistent && playback.mostConsistent.length > 0) {
      const consistent = playback.mostConsistent[0];
      cards.push({
        id: "consistent",
        icon: "🎯",
        title: "Most Consistent",
        user: consistent.user,
        value: consistent.avgPoints.toFixed(1),
        subtitle: "avg points/round",
        color: NEON_COLORS.LimeGreen,
        stats: [
          {
            label: "Variance",
            value: `±${consistent.variance.toFixed(1)}`,
          },
        ],
      });
    }

    // Card 6: Best Guesser
    if (playback.bestGuessers && playback.bestGuessers.length > 0) {
      const guesser = playback.bestGuessers[0];
      cards.push({
        id: "guesser",
        icon: "🎲",
        title: "Best Guesser",
        user: guesser.user,
        value: `${(guesser.accuracy * 100).toFixed(0)}%`,
        subtitle: "accuracy",
        color: NEON_COLORS.BrightGreen,
        stats: [
          {
            label: "Correct",
            value: `${guesser.guesses.filter((g) => g.isCorrect).length}/${
              guesser.guesses.length
            }`,
          },
        ],
      });
    }

    // Card 7: Fastest Submitter
    if (
      playback.fastestSubmitters &&
      playback.fastestSubmitters.length > 0
    ) {
      const fastest = playback.fastestSubmitters[0];
      const avgMinutes = Math.floor(fastest.avgTime / 1000 / 60);
      const avgSeconds = Math.floor((fastest.avgTime / 1000) % 60);
      cards.push({
        id: "fastest-submitter",
        icon: "⚡",
        title: "Fastest Submitter",
        user: fastest.user,
        value: `${avgMinutes}:${avgSeconds.toString().padStart(2, "0")}`,
        subtitle: "avg submission time",
        color: NEON_COLORS.ElectricPurple,
        stats: [
          { label: "Submissions", value: fastest.submissions.toString() },
        ],
      });
    }

    // Card 8: Most Wins
    if (playback.mostWinsUsers && playback.mostWinsUsers.length > 0) {
      const winner = playback.mostWinsUsers[0];
      cards.push({
        id: "most-wins",
        icon: "🏆",
        title: "Most Round Wins",
        user: winner.user,
        value: winner.wins.length.toString(),
        subtitle: winner.wins.length === 1 ? "victory" : "victories",
        color: NEON_COLORS.BrightGold,
        stats: [
          {
            label: "Win Points",
            value: winner.wins.reduce((sum, w) => sum + w.points, 0).toString(),
          },
        ],
      });
    }

    return cards;
  }, [playback]);

  if (summaryCards.length === 0) {
    return (
      <Screen background={{ from: "#1e1b4b", via: "#7c3aed", to: "#000000" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No summary data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#1e1b4b", via: "#7c3aed", to: "#000000" }}>
      <div className="h-full flex flex-col text-white relative overflow-hidden">
        {/* Animated background */}
        {isActive && (
          <>
            {/* Sparkle elements */}
            <div
              className="absolute top-[8%] left-[5%] text-4xl opacity-20 z-0"
              style={{
                animation: "sparkle-twinkle 3s ease-in-out infinite",
              }}
            >
              ✨
            </div>
            <div
              className="absolute top-[15%] right-[8%] text-3xl opacity-15 z-0"
              style={{
                animation: "sparkle-twinkle 3s ease-in-out 1s infinite",
              }}
            >
              ✨
            </div>
            <div
              className="absolute bottom-[20%] left-[10%] text-5xl opacity-20 z-0"
              style={{
                animation: "sparkle-twinkle 3s ease-in-out 2s infinite",
              }}
            >
              ✨
            </div>
            <div
              className="absolute bottom-[35%] right-[12%] text-4xl opacity-15 z-0"
              style={{
                animation: "sparkle-twinkle 3s ease-in-out 1.5s infinite",
              }}
            >
              ✨
            </div>

            {/* Trophy/medal elements */}
            <div
              className="absolute top-[45%] left-[3%] text-5xl opacity-10 z-0"
              style={{
                animation: "gentle-float 6s ease-in-out infinite",
              }}
            >
              🏆
            </div>
            <div
              className="absolute top-[60%] right-[5%] text-4xl opacity-15 z-0"
              style={{
                animation: "gentle-float 5.5s ease-in-out 2s infinite",
              }}
            >
              🥇
            </div>

            {/* Star burst lines */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-64 bg-linear-to-b from-transparent via-purple-400/10 to-transparent z-0"
              style={{
                animation: "star-burst 8s linear infinite",
                transformOrigin: "center center",
              }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-px bg-linear-to-r from-transparent via-purple-400/10 to-transparent z-0"
              style={{
                animation: "star-burst 8s linear 4s infinite",
                transformOrigin: "center center",
              }}
            />
          </>
        )}

        {/* Title */}
        <div className="text-center py-6 z-10">
          <h2 className="text-4xl font-bold drop-shadow-lg">League Summary</h2>
          <p className="text-purple-300 mt-2">
            Highlights from the competition
          </p>
        </div>

        {/* Carousel */}
        <div className="flex-1 relative z-10 min-h-0">
          <HorizontalCarousel
            items={summaryCards}
            isActive={isActive}
            renderItem={(card, index, isItemActive) => (
              <div className="h-full flex items-center justify-center p-8">
                <div
                  className="bg-white/10 backdrop-blur-md rounded-2xl border-2 p-8 max-w-md w-full"
                  style={{
                    borderColor: card.color,
                    boxShadow: isItemActive
                      ? `0 0 40px ${card.color}40, 0 0 80px ${card.color}20`
                      : "none",
                  }}
                >
                  {/* Icon */}
                  <div
                    className="text-7xl text-center mb-4"
                    style={{
                      animation: isItemActive
                        ? "stat-bounce 5s infinite 0.7s both"
                        : "none",
                    }}
                  >
                    {card.icon}
                  </div>

                  {/* Title */}
                  <h3
                    className="text-2xl text-center mb-6 font-semibold"
                    style={{ color: card.color }}
                  >
                    {card.title}
                  </h3>

                  {/* User Avatar (if applicable) */}
                  {card.user && (
                    <div className="flex justify-center mb-4">
                      <Avatar user={card.user} size="lg" />
                    </div>
                  )}

                  {/* Main Value */}
                  <div className="text-center mb-2">
                    <div
                      className="text-6xl font-bold"
                      style={{
                        color: card.color,
                        textShadow: `0 0 20px ${card.color}80`,
                      }}
                    >
                      {card.value}
                    </div>
                    <div className="text-xl text-purple-200 mt-2">
                      {card.subtitle}
                    </div>
                  </div>

                  {/* User Name (if applicable) */}
                  {card.user && (
                    <div className="text-center text-2xl font-semibold mb-4">
                      {card.user.firstName} {card.user.lastName}
                    </div>
                  )}

                  {/* Track Info (if applicable) */}
                  {card.trackInfo && (
                    <div className="bg-white/5 rounded-lg p-3 mb-4">
                      <div className="text-sm font-semibold truncate">
                        {card.trackInfo.title}
                      </div>
                      <div className="text-xs text-purple-300 truncate">
                        {card.trackInfo.artists.join(", ")}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  {card.stats && card.stats.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
                      {card.stats.map((stat, i) => (
                        <div key={i} className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {stat.value}
                          </div>
                          <div className="text-sm text-purple-300">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          />
        </div>

        {/* Custom animations */}
        <style jsx>{`
          @keyframes sparkle-twinkle {
            0%,
            100% {
              opacity: 0.1;
              transform: scale(1) rotate(0deg);
            }
            50% {
              opacity: 0.3;
              transform: scale(1.2) rotate(180deg);
            }
          }

          @keyframes gentle-float {
            0%,
            100% {
              transform: translateY(0) rotate(-5deg);
              opacity: 0.1;
            }
            50% {
              transform: translateY(-20px) rotate(5deg);
              opacity: 0.2;
            }
          }

          @keyframes star-burst {
            0% {
              transform: translate(-50%, -50%) rotate(0deg);
              opacity: 0.1;
            }
            50% {
              opacity: 0.15;
            }
            100% {
              transform: translate(-50%, -50%) rotate(360deg);
              opacity: 0.1;
            }
          }

          @keyframes stat-bounce {
            0% {
              transform: scale(0.8);
            }
            10% {
              transform: scale(1.15);
            }
            20% {
              transform: scale(1);
            }
            60% {
              transform: scale(1);
            }
            100% {
              transform: scale(0.8);
            }
          }
        `}</style>
      </div>
    </Screen>
  );
}

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
