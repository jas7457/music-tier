import type { GETReponse as GetTrackDetails } from "../app/api/spotify/track/[trackId]/route";

export async function getTrackDetails(
  trackId: string
): Promise<GetTrackDetails> {
  const response = await fetch(`/api/spotify/track/${trackId}`);
  if (!response.ok) {
    throw new Error(
      `Error fetching track details: ${response.status} ${response.statusText}`
    );
  }
  return response.json();
}
