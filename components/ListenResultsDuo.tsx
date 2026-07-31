'use client';

import { useAuth } from '@/lib/AuthContext';
import { PopulatedLeague, PopulatedRound } from '@/lib/types';
import { MaybeLink } from './MaybeLink';
import { useState } from 'react';
import { useToast } from '@/lib/ToastContext';
import { createSpotifyPlaylist } from '@/lib/utils/createSpotifyPlaylist';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';

export function ListenResultsDuo({
  league,
  round,
}: {
  league: PopulatedLeague;
  round: PopulatedRound;
}) {
  const { user } = useAuth();
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const toast = useToast();

  if (!user) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2 pt-2">
      {round.spotifyPlaylistId ? (
        <a
          href={`https://open.spotify.com/playlist/${round.spotifyPlaylistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w98-btn flex-col gap-1 py-2 no-underline"
        >
          <svg
            width={30}
            height={30}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-black"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v12h16V6H4zm4 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm8 0c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zM8 10c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm8 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-6 5h4v2h-4v-2z" />
          </svg>
          <span className="text-sm">Listen</span>
        </a>
      ) : (
        <button
          disabled={creatingPlaylist}
          onClick={async () => {
            try {
              setCreatingPlaylist(true);
              await createSpotifyPlaylist({ round });
            } catch (err) {
              const message = unknownToErrorString(
                err,
                'Error creating playlist',
              );
              toast.show({
                title: 'Error creating playlist',
                variant: 'error',
                message,
              });
            } finally {
              setCreatingPlaylist(false);
            }
          }}
          className="w98-btn flex-col gap-1 py-2"
        >
          <svg
            width={30}
            height={30}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-black"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v12h16V6H4zm4 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm8 0c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zM8 10c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm8 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-6 5h4v2h-4v-2z" />
          </svg>
          <span className="text-sm">
            {creatingPlaylist ? 'Creating...' : 'Create playlist'}
          </span>
        </button>
      )}

      {/* Results link */}
      <MaybeLink
        href={`/leagues/${league._id}/rounds/${round._id}`}
        forceNormalText={!round._id}
        className="w98-btn flex-col gap-1 py-2 no-underline"
      >
        <svg
          width={30}
          height={30}
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-black"
        >
          <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
        </svg>
        <span className="text-sm">Results</span>
      </MaybeLink>
    </div>
  );
}
