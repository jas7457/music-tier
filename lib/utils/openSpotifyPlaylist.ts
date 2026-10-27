import { PopulatedRound } from '../types';
import { APP_NAME } from './constants';

/**
 * Opens the round's Spotify playlist in a new tab. The server makes the
 * playlist if the round doesn't have one yet, or makes a fresh one if the
 * saved one has been deleted.
 *
 * Call this straight from a click handler: the tab is opened right away
 * (before waiting on the server) so browsers don't block it as a popup.
 */
export async function openSpotifyPlaylist({
  round,
}: {
  round: PopulatedRound;
}) {
  const tab = window.open('', '_blank');
  try {
    const response = await fetch('/api/spotify/playlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${APP_NAME} - ${round.title}`,
        roundId: round._id,
        description: `A ${APP_NAME} playlist`,
        songs: round.submissions.map(
          (submission) => `spotify:track:${submission.trackInfo.trackId}`,
        ),
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to open playlist');
    }
    if (!data.playlistId) {
      throw new Error('No playlist ID returned');
    }
    const url = `https://open.spotify.com/playlist/${data.playlistId}`;
    if (tab && !tab.closed) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    tab?.close();
    const errorMessage = (() => {
      if (typeof err === 'string') {
        return err;
      }
      if (err instanceof Error) {
        return err.message;
      }
      return 'An unknown error occurred';
    })();
    throw new Error(errorMessage);
  }
}
