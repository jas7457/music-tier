"use client";

import { twMerge } from "tailwind-merge";
import { Screen } from "../components/Screen";
import type { PlaybackScreenProps } from "../types";
import { Avatar } from "@/components/Avatar";
import { MultiLine } from "@/components/MultiLine";
import { HorizontalCarousel } from "../components/HorizontalCarousel";
import { useEffect, useRef, useState } from "react";
import { TrackInfo } from "@/databaseTypes";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";
import { ThreeDSong } from "../components/3DSong";

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
        onItemChange={setScreenIndex}
        renderItem={(song, index, isItemActive) => (
          <div className="h-full flex items-center px-8 py-12 text-white overflow-hidden relative">
            {selectedSongs[index] && (
              <AnimatedImageBackdrop
                imageUrl={selectedSongs[index].albumImageUrl}
              />
            )}

            {/* Floating chat bubbles in background - only for first place */}
            {index === 0 && isItemActive && isActive && (
              <>
                <div
                  className="absolute top-[10%] left-[8%] text-5xl opacity-30 z-0"
                  style={{
                    animation: "float-bubble 4s ease-in-out infinite",
                  }}
                >
                  💬
                </div>
                <div
                  className="absolute top-[25%] right-[12%] text-4xl opacity-40 z-0"
                  style={{
                    animation: "float-bubble 3.5s ease-in-out 0.5s infinite",
                  }}
                >
                  💭
                </div>
                <div
                  className="absolute bottom-[20%] left-[15%] text-6xl opacity-25 z-0"
                  style={{
                    animation: "float-bubble 4.5s ease-in-out 1s infinite",
                  }}
                >
                  💬
                </div>
                <div
                  className="absolute top-[60%] right-[10%] text-5xl opacity-35 z-0"
                  style={{
                    animation: "float-bubble 3.8s ease-in-out 1.5s infinite",
                  }}
                >
                  💭
                </div>
                <div
                  className="absolute bottom-[35%] right-[20%] text-4xl opacity-30 z-0"
                  style={{
                    animation: "float-bubble 4.2s ease-in-out 2s infinite",
                  }}
                >
                  💬
                </div>
              </>
            )}

            <div className="w-full flex flex-col gap-4 max-h-full relative z-10">
              {/* Title */}
              <div
                className={twMerge(
                  "transition-all duration-500 transform",
                  isItemActive
                    ? "opacity-100 delay-0 translate-y-0"
                    : "opacity-0 -translate-y-4"
                )}
              >
                <h2 className="text-center drop-shadow-lg">
                  {playback.mostNotedSongs.length > 1
                    ? `#${index + 1} Most Discussed`
                    : "Most Discussed"}
                </h2>
                <p className="text-2xl text-purple-300 text-center drop-shadow-lg">
                  {song.notes.length}{" "}
                  {song.notes.length === 1 ? "note" : "notes"}
                </p>
              </div>

              {/* Album Art and Song Info */}
              <div
                className={twMerge(
                  "flex flex-col items-center gap-3 transition-all duration-700 transform",
                  isItemActive
                    ? "opacity-100 scale-100 delay-200 translate-y-0"
                    : "opacity-0 scale-50 translate-y-10"
                )}
              >
                <ThreeDSong
                  trackInfo={song.trackInfo}
                  round={league.rounds.completed[0]}
                  size={300}
                  isActive={isItemActive}
                  submittedBy={song.user}
                  onPlaySong={(selectedSong) =>
                    setSelectedSongs((prev) => {
                      const newSelected = [...prev];
                      newSelected[index] = selectedSong;
                      return newSelected;
                    })
                  }
                  playlist={[song.trackInfo]}
                />
                <div
                  className="text-center"
                  style={{
                    animation: isItemActive
                      ? "fade-in-up 0.6s ease-out 0.4s both"
                      : "none",
                  }}
                >
                  <p className="text-xl md:text-2xl font-bold drop-shadow-lg">
                    {song.trackInfo.title}
                  </p>
                  <p className="text-md md:text-lg text-purple-200 drop-shadow-md">
                    {song.trackInfo.artists.join(", ")}
                  </p>
                  <p className="text-sm text-purple-300 mt-1 drop-shadow-md">
                    Submitted by {song.user.firstName} {song.user.lastName}
                  </p>
                </div>
              </div>

              {/* Scrollable Notes List */}
              <div
                className={twMerge(
                  "flex-1 w-full overflow-y-auto transition-all duration-500",
                  isItemActive ? "opacity-100 delay-400" : "opacity-0"
                )}
              >
                <div className="space-y-3 pb-4">
                  {song.notes.map((note, noteIndex) => (
                    <div
                      key={noteIndex}
                      className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 transform transition-all duration-500 hover:bg-white/20 hover:scale-102 hover:border-white/40"
                      style={{
                        animation: isItemActive
                          ? `note-slide-in 0.5s ease-out ${
                              noteIndex * 80 + 600
                            }ms both`
                          : "none",
                      }}
                    >
                      <div className="grid items-center gap-3 grid-cols-[auto_1fr]">
                        <div
                          style={{
                            animation: isItemActive
                              ? `avatar-bounce 0.4s ease-out ${
                                  noteIndex * 80 + 700
                                }ms both`
                              : "none",
                          }}
                        >
                          <Avatar
                            user={note.user}
                            size={16}
                            includeLink={false}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm drop-shadow-md">
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

            {/* Custom animations */}
            <style jsx>{`
              @keyframes float-bubble {
                0% {
                  opacity: 0;
                  transform: translateY(20px);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

              @keyframes note-slide-in {
                0% {
                  opacity: 0;
                  transform: translateX(-30px);
                }
                60% {
                  transform: translateX(5px);
                }
                100% {
                  opacity: 1;
                  transform: translateX(0);
                }
              }

              @keyframes avatar-bounce {
                0% {
                  opacity: 0;
                  transform: scale(0) rotate(-180deg);
                }
                60% {
                  transform: scale(1.15) rotate(10deg);
                }
                100% {
                  opacity: 1;
                  transform: scale(1) rotate(0deg);
                }
              }
            `}</style>
          </div>
        )}
      />
    </Screen>
  );
}
