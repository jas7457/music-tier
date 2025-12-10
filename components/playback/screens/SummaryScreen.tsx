"use client";

import { twMerge } from "tailwind-merge";
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
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">No song data available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center p-8 text-white">
      <div className="w-full flex flex-col gap-4 max-h-full pb-8">
        {/* Title */}
        <div
          className={twMerge(
            "transition-all duration-500",
            isActive ? "opacity-100 delay-0" : "opacity-0"
          )}
        >
          <h2 className="text-center">League Summary</h2>
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
              <h3 className="text-2xl text-purple-300 text-center mb-4">
                Top Songs
              </h3>
              <div className="space-y-3">
                {songs.map((song, index) => (
                  <div
                    key={song.trackInfo.trackId}
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                  >
                    <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4">
                      {/* Rank */}
                      <div className="text-3xl font-bold text-purple-300 w-12 text-center">
                        #{index + 1}
                      </div>

                      {/* Album Art */}
                      <div className="shrink-0">
                        <AlbumArt
                          trackInfo={song.trackInfo}
                          size={56}
                          round={song.round}
                          playlist={playlist}
                        />
                      </div>

                      {/* Song and User Info */}
                      <div className="overflow-hidden">
                        <p className="text-lg font-semibold truncate">
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
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">
                          {song.points}
                        </p>
                        <p className="text-xs text-purple-300">
                          {song.voters} {song.voters === 1 ? "voter" : "voters"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Wins Section */}
            <div>
              <h3 className="text-2xl text-purple-300 text-center mb-4">
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

                  return (
                    <div
                      key={userWin.user._id}
                      className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                    >
                      <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-4">
                        {/* Rank */}
                        <div className="text-3xl font-bold text-purple-300 w-12 text-center">
                          #{index + 1}
                        </div>

                        {/* Avatar */}
                        <Avatar
                          user={userWin.user}
                          size={12}
                          includeLink={false}
                        />

                        {/* User Info */}
                        <div className="overflow-hidden">
                          <p className="text-lg font-semibold truncate">
                            {userWin.user.userName}
                          </p>
                        </div>

                        {/* Wins */}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-400">
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
    </div>
  );
}
