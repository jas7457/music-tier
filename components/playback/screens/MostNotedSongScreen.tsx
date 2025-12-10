"use client";

import { twMerge } from "tailwind-merge";
import { Screen } from "../components/Screen";
import type { PlaybackScreenProps } from "../types";
import AlbumArt from "@/components/AlbumArt";
import { Avatar } from "@/components/Avatar";
import { MultiLine } from "@/components/MultiLine";
import { HorizontalCarousel } from "../components/HorizontalCarousel";
import { useEffect, useRef, useState } from "react";
import { TrackInfo } from "@/databaseTypes";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";

export function MostNotedSongScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  const [selectedSongs, setSelectedSongs] = useState<Array<TrackInfo | null>>(
    playback.mostNotedSongs.map((song) => song.trackInfo)
  );

  const [screenIndex, setScreenIndex] = useState(0);

  const { playTrack } = useSpotifyPlayer();
  const playTrackRef = useRef(playTrack);
  // eslint-disable-next-line react-hooks/refs
  playTrackRef.current = playTrack;

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const track = selectedSongs[screenIndex];
    if (track) {
      playTrackRef.current({
        trackInfo: track,
        round: "same",
        playlist: [track],
        startTime: 15_000,
      });
    }
  }, [isActive, screenIndex, selectedSongs]);

  if (playback.mostNotedSongs.length === 0) {
    return (
      <Screen background={{ from: "#f97316", via: "#a855f7", to: "#10b981" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No notes available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#f97316", via: "#a855f7", to: "#10b981" }}>
      <HorizontalCarousel
        items={playback.mostNotedSongs}
        isActive={isActive}
        buttonPosition="bottom"
        onItemChange={setScreenIndex}
        renderItem={(song, index, isItemActive) => (
          <div className="h-full flex items-center p-8 text-white overflow-hidden relative">
            {selectedSongs[index] && (
              <AnimatedImageBackdrop
                imageUrl={selectedSongs[index].albumImageUrl}
              />
            )}
            <div className="w-full flex flex-col gap-4 max-h-full relative z-10">
              {/* Title */}
              <div
                className={twMerge(
                  "transition-all duration-500",
                  isItemActive ? "opacity-100 delay-0" : "opacity-0"
                )}
              >
                <h2 className="text-center">
                  {playback.mostNotedSongs.length > 1
                    ? `#${index + 1} Most Discussed`
                    : "Most Discussed"}
                </h2>
                <p className="text-2xl text-purple-300 text-center">
                  {song.notes.length}{" "}
                  {song.notes.length === 1 ? "note" : "notes"}
                </p>
              </div>

              {/* Album Art and Song Info */}
              <div
                className={twMerge(
                  "flex flex-col items-center gap-3 transition-all duration-500",
                  isItemActive
                    ? "opacity-100 scale-100 delay-200"
                    : "opacity-0 scale-50"
                )}
              >
                <AlbumArt
                  trackInfo={song.trackInfo}
                  round={league.rounds.completed[0]}
                  size={300}
                  className="animate-[pulse-glow_2s_ease-in-out_infinite]"
                  onPlaySong={(song) =>
                    setSelectedSongs((prev) => {
                      const newSelected = [...prev];
                      newSelected[index] = song;
                      return newSelected;
                    })
                  }
                />
                <div className="text-center">
                  <p className="text-xl md:text-2xl font-bold">
                    {song.trackInfo.title}
                  </p>
                  <p className="text-md md:text-lg text-purple-200">
                    {song.trackInfo.artists.join(", ")}
                  </p>
                  <p className="text-sm text-purple-300 mt-1">
                    Submitted by {song.user.firstName} {song.user.lastName}
                  </p>
                </div>
              </div>

              {/* Scrollable Notes List */}
              <div
                className={twMerge(
                  "flex-1 w-full overflow-y-auto transition-all duration-500 mb-8",
                  isItemActive ? "opacity-100 delay-400" : "opacity-0"
                )}
              >
                <div className="space-y-3 pb-4">
                  {song.notes.map((note, noteIndex) => (
                    <div
                      key={noteIndex}
                      className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                    >
                      <div className="grid items-center gap-3 grid-cols-[auto_1fr]">
                        <Avatar
                          user={note.user}
                          size={16}
                          includeLink={false}
                        />
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
        )}
      />
    </Screen>
  );
}
