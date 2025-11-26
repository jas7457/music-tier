import { PopulatedTrackInfo } from "./types";

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  preview_url: string | null;
}

export interface SpotifyPlaylistResponse {
  name: string;
  tracks: {
    items: Array<{
      track: SpotifyTrack;
    }>;
  };
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email?: string;
  images?: Array<{ url: string; height: number; width: number }>;
}

const CLIENT_ID = "3b4aa4f5d652435db1d08f41ea973c44";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "";
const REDIRECT_URI =
  process.env.NODE_ENV === "development"
    ? "https://127.0.0.1:3000/callback"
    : "https://music-tier.vercel.app/callback";

export const generateRandomString = (length: number): string => {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

export const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
};

export const base64encode = (input: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(input);
  const chars: string[] = [];
  for (let i = 0; i < uint8Array.length; i++) {
    chars.push(String.fromCharCode(uint8Array[i]));
  }
  return btoa(chars.join(""))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};
const codeVerifier = generateRandomString(64);

export const initiateSpotifyAuth = async (): Promise<void> => {
  if (!CLIENT_ID) {
    throw new Error("Spotify Client ID not configured");
  }

  const scope = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-read-collaborative",
    "streaming",
    "user-read-playback-state",
    "user-modify-playback-state",
    "playlist-modify-private",
    "playlist-modify-public",
  ].join(" ");
  const authUrl = new URL("https://accounts.spotify.com/authorize");

  window.localStorage.setItem("code_verifier", codeVerifier);

  const params = {
    response_type: "code",
    client_id: CLIENT_ID,
    scope,
    redirect_uri: window.location.origin + "/callback",
  };

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
};

export interface SpotifyTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function callbackAuth(
  code: string
): Promise<SpotifyTokenResponse> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for token");
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<SpotifyTokenResponse> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken, // Use old refresh_token if new one not provided
    expires_in: data.expires_in,
    token_type: data.token_type,
  };
}

export const fetchPlaylist = async (
  playlistId: string,
  accessToken: string
): Promise<SpotifyPlaylistResponse> => {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,tracks.items(track(id,name,artists,album(name,images)))`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.statusText}`);
  }

  return response.json();
};

export const getSpotifyUserProfile = async (
  accessToken: string
): Promise<SpotifyUserProfile> => {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  return response.json();
};

export async function getSpotifyDevices(accessToken: string) {
  const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  return response.json();
}

export const extractPlaylistId = (url: string): string | null => {
  const patterns = [
    /spotify:playlist:([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

export function extractTrackIdFromUrl(url: string): string | null {
  const patterns = [
    /spotify:track:([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function getTrackUrlFromId(trackId: string): string {
  if (!trackId) {
    return "";
  }
  return `https://open.spotify.com/track/${trackId}`;
}

export const getTrackDetails = async (
  trackId: string,
  accessToken: string
): Promise<PopulatedTrackInfo> => {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch track: ${response.statusText}`);
  }

  const spotifyTrack: SpotifyTrack = await response.json();
  return spotifyTrackToSubmission(spotifyTrack);
};

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
