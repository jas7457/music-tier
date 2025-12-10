import AlbumArt from "@/components/AlbumArt";
import { TrackInfo } from "@/databaseTypes";
import { PopulatedRound, PopulatedUser } from "@/lib/types";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";

export function Guesses({
  isActive,
  guesses,
}: {
  isActive: boolean;
  guesses: Array<{
    isCorrect: boolean;
    trackInfo: TrackInfo;
    guessedUser: PopulatedUser;
    submitter: PopulatedUser;
    round: PopulatedRound;
  }>;
}) {
  const sortedGuesses = useMemo(() => {
    return guesses.sort((a, b) =>
      a.isCorrect === b.isCorrect ? 0 : a.isCorrect ? -1 : 1
    );
  }, [guesses]);
  const playlist = useMemo(() => {
    return sortedGuesses.map((guess) => guess.trackInfo);
  }, [sortedGuesses]);
  return (
    <div
      className={twMerge(
        "flex-1 w-full overflow-y-auto transition-all duration-500 mb-8",
        isActive ? "opacity-100 delay-400" : "opacity-0"
      )}
    >
      <div className="space-y-2 pb-4">
        {sortedGuesses.map((guess, index) => (
          <div
            key={index}
            className={twMerge(
              "bg-white/10 backdrop-blur-sm rounded-lg p-3 border",
              guess.isCorrect
                ? "border-green-400/50 bg-green-500/10"
                : "border-red-400/50 bg-red-500/10"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{guess.isCorrect ? "✓" : "✗"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mt-1">
                  <AlbumArt
                    trackInfo={guess.trackInfo}
                    round={guess.round}
                    playlist={playlist}
                  />
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold truncate">
                      {guess.trackInfo.title}
                    </p>
                    <p className="text-xs text-purple-200 truncate">
                      {guess.trackInfo.artists.join(", ")}
                    </p>

                    <p className="text-xs">
                      Guessed: {guess.guessedUser.userName}
                      {guess.isCorrect
                        ? ""
                        : ` (was ${guess.submitter.userName})`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
