"use client";

import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { SongScreen } from "./SongScreen";
import { DualScreen } from "../components/DualScreen";
import { UserList } from "../components/UserList";
import { AnimatedImageBackdrop } from "@/components/AnimatedImageBackdrop";

export function UserTopSongScreen({
  playback,
  league,
  isActive,
}: PlaybackScreenProps) {
  if (!playback.userTopSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-white">
        <p className="text-2xl text-purple-300">No submissions available</p>
      </div>
    );
  }

  const { trackInfo, points, user, votes } = playback.userTopSong;

  const voters = votes.map((vote) => ({
    user: vote.userObject,
    rightText: `+${vote.points} pts`,
    note: vote.note,
  }));

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatedImageBackdrop imageUrl={trackInfo.albumImageUrl} />

      <DualScreen
        isActive={isActive}
        backFace={(isFlipped) => (
          <UserList
            isActive={isActive && isFlipped}
            users={voters}
            title="Voters"
          />
        )}
      >
        <SongScreen
          isActive={isActive}
          title="People really dig this one"
          subtitle="Your Top Song"
          trackInfo={trackInfo}
          round={league.rounds.completed[0]}
          points={points}
          pointsStrokeColor={NEON_COLORS.Yellow}
          submittedBy={user}
          voters={voters}
        />
      </DualScreen>
    </div>
  );
}
