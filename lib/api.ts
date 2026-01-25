import type { GETReponse as GetTrackDetails } from '../app/api/spotify/track/[trackId]/route';

export async function getTrackDetails(
  trackId: string,
): Promise<GetTrackDetails> {
  const response = await fetch(`/api/spotify/track/${trackId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || response.statusText);
  }
  return response.json();
}
