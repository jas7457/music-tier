'use client';

import AlbumArt from '@/components/AlbumArt';
import { TrackInfo } from '@/databaseTypes';
import { PopulatedRound } from '@/lib/types';

interface SongListItem {
  trackInfo: TrackInfo;
  round: PopulatedRound;
  leftText?: string;
  rightText?: string;
}

interface SongListProps {
  songs: SongListItem[];
  className?: string;
}

export function SongList({ songs, className }: SongListProps) {
  return (
    <div className={className}>
      {songs.map((song, index) => (
        <div
          key={`${song.trackInfo.trackId}-${index}`}
          className="flex items-center gap-3 bg-white/5 p-3 rounded-lg"
        >
          {song.leftText && (
            <div className="text-sm text-white/80 shrink-0 w-12 text-center">
              {song.leftText}
            </div>
          )}

          <AlbumArt trackInfo={song.trackInfo} round={song.round} size={48} />

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">
              {song.trackInfo.title}
            </div>
            <div className="text-xs text-white/60 truncate">
              {song.trackInfo.artists.join(', ')}
            </div>
          </div>

          {song.rightText && (
            <div className="text-sm text-white/80 shrink-0">
              {song.rightText}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
