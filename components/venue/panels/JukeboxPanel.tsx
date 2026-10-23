'use client';

import { useState } from 'react';
import { PlaylistPartyPlayback } from '@/components/playback/PlaylistPartyPlayback';
import { useSpotifyPlayer } from '@/lib/SpotifyPlayerContext';
import type { PanelProps } from './types';

/** The jukebox: the end-of-league recap and the round playlists. */
export function JukeboxPanel({ league, model, openRound }: PanelProps) {
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const { playTrack } = useSpotifyPlayer();
  const playable = model.allRounds
    .filter((round) => round._id && round.submissions.length > 0 && round.stage !== 'submission')
    .sort((a, b) => b.submissionStartDate - a.submissionStartDate);

  return (
    <div className="venue-panel">
      {league.playback ? (
        <section className="venue-card venue-recap">
          <div className="text-4xl">🎉</div>
          <h3 className="font-black text-xl">Playlist Party Playback</h3>
          <p className="text-sm opacity-80">
            The whole league, wrapped. Biggest fans, harshest critics, and who
            took the crown.
          </p>
          <button
            type="button"
            className="venue-cta mt-3"
            onClick={() => {
              if (league.playback?.topSong) {
                playTrack({ trackInfo: league.playback.topSong.trackInfo, round: 'same' });
              }
              setPlaybackOpen(true);
            }}
          >
            ▶ Play the recap
          </button>
        </section>
      ) : (
        <section className="venue-card text-center">
          <div className="text-4xl">🎶</div>
          <h3 className="font-bold">Recap unlocks when the league ends</h3>
          <p className="text-ink-muted text-sm">
            {league.rounds.completed.length} of {league.numberOfRounds} rounds
            played so far.
          </p>
        </section>
      )}

      {playable.length > 0 && (
        <section>
          <h3 className="venue-section-title">Round playlists</h3>
          <div className="grid gap-2">
            {playable.map((round) => (
              <button
                key={round._id}
                type="button"
                className="venue-row"
                onClick={() => openRound(round._id)}
              >
                <div className="flex -space-x-3 shrink-0">
                  {round.submissions.slice(0, 3).map((s) => (
                     
                    <img
                      key={s._id}
                      src={s.trackInfo.albumImageUrl}
                      alt=""
                      className="w-9 h-9 rounded-md ring-2 ring-white object-cover"
                    />
                  ))}
                </div>
                <div className="min-w-0 text-left">
                  <div className="font-semibold truncate">
                    R{round.roundIndex + 1}: {round.title}
                  </div>
                  <div className="text-xs text-ink-subtle">
                    {round.submissions.length} tracks
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {playbackOpen && (
        <PlaylistPartyPlayback
          league={league}
          isOpen={playbackOpen}
          onClose={() => setPlaybackOpen(false)}
        />
      )}
    </div>
  );
}
