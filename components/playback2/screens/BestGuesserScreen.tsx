"use client";

import { Screen } from "../components/Screen";
import { NEON_COLORS } from "../constants";
import type { PlaybackScreenProps } from "../types";
import { HorizontalCarousel } from "../components/HorizontalCarousel";
import { UserStatScreen } from "./UserStatScreen";

export function BestGuesserScreen({ playback, isActive }: PlaybackScreenProps) {
  const stat = playback.bestGuessers;

  if (stat.length === 0) {
    return (
      <Screen background={{ from: "#10b981", via: "#ef4444", to: "#f97316" }}>
        <div className="h-full flex flex-col items-center justify-center p-8 text-white">
          <p className="text-2xl text-purple-300">No voting data available</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen background={{ from: "#10b981", via: "#ef4444", to: "#f97316" }}>
      <HorizontalCarousel
        items={stat}
        isActive={isActive}
        renderItem={(guesser, index, isItemActive) => {
          const isGoodGuesser = guesser.accuracy >= 0.5;

          return (
            <UserStatScreen
              isActive={isItemActive}
              kicker={
                isGoodGuesser ? "Are you a psychic?" : "Better luck next time"
              }
              title={
                stat.length > 1 ? `#${index + 1} Best Guesser` : "Best Guesser"
              }
              user={guesser.user}
              strokeColor={
                isGoodGuesser ? NEON_COLORS.BrightGreen : NEON_COLORS.VividRed
              }
              autoSelectFirstSong
              stat={{
                value: `${(guesser.accuracy * 100).toFixed(0)}%`,
                label: "vote accuracy",
                icon: isGoodGuesser ? "🎯" : "🎲",
                songs: guesser.guesses
                  .sort((a, b) =>
                    a.isCorrect === b.isCorrect ? 0 : a.isCorrect ? -1 : 1
                  )
                  .map((guess) => ({
                    trackInfo: guess.trackInfo,
                    points: 0,
                    round: guess.round,
                    leftText: guess.isCorrect ? "✓" : "✗",
                    className: guess.isCorrect
                      ? "border-green-400/50 bg-green-500/10"
                      : "border-red-400/50 bg-red-500/10",
                  })),
              }}
              noDataMessage="No voting data available"
            />
          );
        }}
      />
    </Screen>
  );
}
