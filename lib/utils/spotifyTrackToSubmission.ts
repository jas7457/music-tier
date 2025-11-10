import { SpotifyTrack } from "../spotify";
import { PopulatedTrackInfo } from "../types";

export function spotifyTrackToSubmission(
  track: SpotifyTrack
): PopulatedTrackInfo {
  return {
    trackId: track.id,
    title: track.name,
    artists: track.artists.map((artist) => artist.name),
    albumName: track.album.name,
    albumImageUrl: track.album.images[0]?.url || "",
  };
}
