/**
 * Server-side helpers for a round's Spotify playlist.
 *
 * Spotify never truly deletes a playlist: when its owner "deletes" it, they
 * just stop following it. So we treat a playlist as gone when either
 *   - Spotify says it doesn't exist (404), or
 *   - the person asking owns it and it's no longer in their library.
 * When someone else asks about a playlist its owner deleted, Spotify may
 * still return it; we can only catch that case once the owner clicks it.
 *
 * Uses the endpoints from Spotify's February 2026 Web API changes
 * (POST /me/playlists, POST /playlists/{id}/items, GET /me/library/contains).
 */

const API = 'https://api.spotify.com/v1';

type PlaylistStatus = 'exists' | 'gone';

async function spotifyFetch(
  path: string,
  accessToken: string,
  init: RequestInit = {},
) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

async function spotifyError(response: Response) {
  try {
    const body = await response.json();
    return `Spotify API error: ${body?.error?.message ?? response.statusText}`;
  } catch {
    return `Spotify API error: ${response.statusText}`;
  }
}

/**
 * Whether a saved playlist can still be opened. Anything we can't be sure
 * about (rate limits, outages, expired tokens) counts as 'exists': it's much
 * better to open a playlist that might be gone than to make a duplicate of
 * one that's fine.
 */
export async function getPlaylistStatus({
  playlistId,
  accessToken,
  viewerSpotifyId,
}: {
  playlistId: string;
  accessToken: string;
  viewerSpotifyId?: string;
}): Promise<PlaylistStatus> {
  try {
    const response = await spotifyFetch(
      `/playlists/${encodeURIComponent(playlistId)}?fields=id,owner(id)`,
      accessToken,
    );
    if (response.status === 404) {
      return 'gone';
    }
    if (!response.ok) {
      return 'exists';
    }
    const playlist: { owner?: { id?: string } } = await response.json();

    // Only the owner can tell us whether they deleted it.
    if (!viewerSpotifyId || playlist.owner?.id !== viewerSpotifyId) {
      return 'exists';
    }
    const contains = await spotifyFetch(
      `/me/library/contains?uris=${encodeURIComponent(`spotify:playlist:${playlistId}`)}`,
      accessToken,
    );
    if (!contains.ok) {
      return 'exists';
    }
    const [inLibrary] = (await contains.json()) as boolean[];
    return inLibrary === false ? 'gone' : 'exists';
  } catch {
    return 'exists';
  }
}

/** Creates a playlist for the signed-in user and fills it with the songs. */
export async function createPlaylist({
  accessToken,
  name,
  description,
  uris,
}: {
  accessToken: string;
  name: string;
  description: string;
  uris: string[];
}): Promise<{ playlistId: string } | { error: string; status: number }> {
  const created = await spotifyFetch('/me/playlists', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      public: true,
      collaborative: true,
    }),
  });
  if (!created.ok) {
    return { error: await spotifyError(created), status: created.status };
  }
  const { id: playlistId } = (await created.json()) as { id: string };

  // Spotify takes at most 100 items per request
  for (let i = 0; i < uris.length; i += 100) {
    const added = await spotifyFetch(
      `/playlists/${playlistId}/items`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ uris: uris.slice(i, i + 100), position: i }),
      },
    );
    if (!added.ok) {
      return { error: await spotifyError(added), status: added.status };
    }
  }
  return { playlistId };
}
