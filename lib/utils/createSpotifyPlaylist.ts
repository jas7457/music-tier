import { PopulatedRound } from '../types';
import { APP_NAME } from './constants';

export async function createSpotifyPlaylist({
  round,
}: {
  round: PopulatedRound;
}) {
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
      throw new Error(data.error || 'Failed to create playlist');
    }
    if (!data.playlistId) {
      throw new Error('No playlist ID returned');
    }
    window.open(
      `https://open.spotify.com/playlist/${data.playlistId}`,
      '_blank',
    );
  } catch (err) {
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
