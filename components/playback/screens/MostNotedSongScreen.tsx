"use client";

import { twMerge } from "tailwind-merge";
import type { PlaybackScreenProps } from "../types";
import AlbumArt from "@/components/AlbumArt";
import { Avatar } from "@/components/Avatar";
import { MultiLine } from "@/components/MultiLine";

export function MostNotedSongScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  if (!playback.mostNotedSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">No notes available</p>
      </div>
    );
  }

  const { trackInfo, notes, user } = playback.mostNotedSong;

  return (
    <div className="h-full flex items-center p-8 text-white">
      <div className="w-full flex flex-col gap-4 max-h-full">
        {/* Title */}
        <div
          className={twMerge(
            "transition-all duration-500",
            isActive ? "opacity-100 delay-0" : "opacity-0"
          )}
        >
          <h2 className="text-center">Most Discussed</h2>
          <p className="text-2xl text-purple-300 text-center">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </p>
        </div>

        {/* Album Art and Song Info */}
        <div
          className={twMerge(
            "flex flex-col items-center gap-3 transition-all duration-500",
            isActive ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-50"
          )}
        >
          <AlbumArt
            trackInfo={trackInfo}
            round={league.rounds.completed[0]}
            size={140}
            className="animate-[pulse-glow_2s_ease-in-out_infinite]"
          />
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold">{trackInfo.title}</p>
            <p className="text-md md:text-lg text-purple-200">
              {trackInfo.artists.join(", ")}
            </p>
            <p className="text-sm text-purple-300 mt-1">
              Submitted by {user.firstName} {user.lastName}
            </p>
          </div>
        </div>

        {/* Scrollable Notes List */}
        <div
          className={twMerge(
            "flex-1 w-full overflow-y-auto transition-all duration-500 mb-8",
            isActive ? "opacity-100 delay-400" : "opacity-0"
          )}
        >
          <div className="space-y-3 pb-4">
            {notes.map((note, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
              >
                <div className="grid items-center gap-3 grid-cols-[auto_1fr]">
                  <Avatar user={note.user} size={24} includeLink={false} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">
                        {note.user.userName}
                      </p>
                    </div>

                    <p className="text-sm text-purple-100 wrap-break-word">
                      <MultiLine>{note.text}</MultiLine>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
