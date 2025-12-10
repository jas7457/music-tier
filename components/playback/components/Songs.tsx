import { twMerge } from "tailwind-merge";
import type { TrackInfo } from "@/databaseTypes";
import type { PopulatedRound } from "@/lib/types";
import AlbumArt from "@/components/AlbumArt";
import { useMemo } from "react";

interface SongsProps {
  songs: Array<{
    trackInfo: TrackInfo;
    points: number;
    round: PopulatedRound;
  }>;
  isActive: boolean;
}

export function Songs({ songs, isActive }: SongsProps) {
  const playlist = useMemo(() => {
    return songs.map((song) => song.trackInfo);
  }, [songs]);

  return (
    <div
      className={twMerge(
        "flex-1 w-full overflow-y-auto transition-all duration-500 mb-8",
        isActive ? "opacity-100 delay-400" : "opacity-0"
      )}
    >
      <div className="space-y-2 pb-4">
        {songs.map((song, index) => (
          <div
            key={index}
            className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20"
          >
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <AlbumArt
                trackInfo={song.trackInfo}
                size={56}
                round={song.round}
                playlist={playlist}
              />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">
                  {song.trackInfo.title}
                </p>
                <p className="text-xs text-purple-200 truncate">
                  {song.trackInfo.artists.join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p className={twMerge("text-lg font-bold text-green-400")}>
                  +{song.points}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
