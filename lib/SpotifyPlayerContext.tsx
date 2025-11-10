"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";

interface SpotifyPlayerContextType {
  player: Spotify.Player | null;
  deviceId: string | null;
  currentTrack: Spotify.WebPlaybackTrack | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isReady: boolean;
  hasInitialized: boolean;
  playTrack: (trackUri: string) => Promise<void>;
  pausePlayback: () => Promise<void>;
  resumePlayback: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seekToPosition: (position: number) => Promise<void>;
  setPlayerVolume: (volume: number) => Promise<void>;
  error: string | null;
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextType | null>(
  null
);

export const useSpotifyPlayer = () => {
  const context = useContext(SpotifyPlayerContext);
  if (!context) {
    throw new Error(
      "useSpotifyPlayer must be used within a SpotifyPlayerProvider"
    );
  }
  return context;
};

interface SpotifyPlayerProviderProps {
  children: React.ReactNode;
  tracks?: Array<{ id: string; uri: string }>;
}

export function SpotifyPlayerProvider({
  children,
  tracks = [],
}: SpotifyPlayerProviderProps) {
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] =
    useState<Spotify.WebPlaybackTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isReady, setIsReady] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tracksRef = useRef(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    const token = Cookies.get("spotify_access_token");
    if (!token) {
      setIsReady(false);
      setHasInitialized(true);
      return;
    }
    let spotifyPlayer: Spotify.Player;

    // after 3 seconds, assume it will not itialize
    const initializedTimeout = setTimeout(() => {
      setHasInitialized(true);
    }, 3_000);

    window.onSpotifyWebPlaybackSDKReady = () => {
      spotifyPlayer = new window.Spotify.Player({
        name: "Music Tier Player",
        getOAuthToken: (cb) => cb(token),
        volume: volume,
      });

      // Ready event - device is ready
      spotifyPlayer.addListener("ready", async ({ device_id }: any) => {
        console.log("Spotify Player Ready with Device ID:", device_id);
        clearTimeout(initializedTimeout);
        setHasInitialized(true);
        setDeviceId(device_id);
        setIsReady(true);

        // Fetch currently playing track
        try {
          const response = await fetch(
            "https://api.spotify.com/v1/me/player/currently-playing",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok && response.status !== 204) {
            const data = await response.json();
            if (data && data.item) {
              // Convert Spotify API track to WebPlaybackTrack format
              const track = {
                id: data.item.id,
                uri: data.item.uri,
                name: data.item.name,
                album: {
                  uri: data.item.album.uri,
                  name: data.item.album.name,
                  images: data.item.album.images,
                },
                artists: data.item.artists.map((artist: any) => ({
                  uri: artist.uri,
                  name: artist.name,
                })),
                duration_ms: data.item.duration_ms,
              };
              setCurrentTrack(track);
              setIsPlaying(data.is_playing);
              setIsPaused(!data.is_playing);
              setDuration(data.item.duration_ms);
              setCurrentTime(data.progress_ms || 0);
            }
          }
        } catch (error) {
          console.error("Error fetching currently playing track:", error);
        }
      });

      // Not Ready event - device has gone offline
      spotifyPlayer.addListener("not_ready", ({ device_id }: any) => {
        console.log("Spotify Player Not Ready with Device ID:", device_id);
        setHasInitialized(true);
        clearTimeout(initializedTimeout);
        setIsReady(false);
      });

      // Player state changed
      spotifyPlayer.addListener("player_state_changed", (state: any) => {
        if (!state) return;

        const newTrack = state.track_window.current_track;
        setCurrentTrack(newTrack);
        setIsPaused(state.paused);
        setIsPlaying(!state.paused);
        setCurrentTime(state.position);
        setDuration(newTrack.duration_ms);
      });

      // Connect to the player
      spotifyPlayer.connect().then((success: boolean) => {
        if (success) {
          console.log("Spotify Player Connected");
          setPlayer(spotifyPlayer);
        }
      });
    };

    // If SDK is already loaded, initialize immediately
    if (window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady();
    }

    return () => {
      clearTimeout(initializedTimeout);
      if (spotifyPlayer) {
        spotifyPlayer.disconnect();
      }
    };
  }, [volume]);

  // Poll currently playing track to sync with other devices
  useEffect(() => {
    const token = Cookies.get("spotify_access_token");
    if (!token) return;

    const pollCurrentlyPlaying = async () => {
      return;
      try {
        const response = await fetch(
          "https://api.spotify.com/v1/me/player/currently-playing",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok && response.status !== 204) {
          const data = await response.json();
          if (data && data.item) {
            // Convert Spotify API track to WebPlaybackTrack format
            const track = {
              id: data.item.id,
              uri: data.item.uri,
              name: data.item.name,
              album: {
                uri: data.item.album.uri,
                name: data.item.album.name,
                images: data.item.album.images,
              },
              artists: data.item.artists.map((artist: any) => ({
                uri: artist.uri,
                name: artist.name,
              })),
              duration_ms: data.item.duration_ms,
            };

            // Only update if track changed
            if (currentTrack?.id !== track.id) {
              setCurrentTrack(track);
            }

            setIsPlaying(data.is_playing);
            setIsPaused(!data.is_playing);
            setDuration(data.item.duration_ms);
            setCurrentTime(data.progress_ms || 0);
          } else {
            // Nothing playing
            if (currentTrack) {
              setCurrentTrack(null);
              setIsPlaying(false);
              setIsPaused(true);
            }
          }
        }
      } catch (error) {
        console.error("Error polling currently playing:", error);
      }
    };

    // Poll every 1 second
    const interval = setInterval(pollCurrentlyPlaying, 1000);

    // Poll immediately on mount
    pollCurrentlyPlaying();

    return () => clearInterval(interval);
  }, [currentTrack]);

  const playTrack = async (trackUri: string) => {
    if (!deviceId) {
      setError("No Spotify device available");
      return;
    }

    const accessToken = Cookies.get("spotify_access_token");
    if (!accessToken) {
      setError("No Spotify access token");
      return;
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [trackUri],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to start playback: ${response.statusText}`);
      }

      setIsPlaying(true);
      setError(null);
    } catch (error) {
      console.error("Error playing track:", error);
      setError("Failed to play track. Make sure you have Spotify Premium.");
    }
  };

  const pausePlayback = async () => {
    const accessToken = Cookies.get("spotify_access_token");
    if (!accessToken) return;

    try {
      await fetch("https://api.spotify.com/v1/me/player/pause", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setIsPlaying(false);
    } catch (error) {
      console.error("Error pausing playback:", error);
    }
  };

  const resumePlayback = async () => {
    const accessToken = Cookies.get("spotify_access_token");
    if (!accessToken) return;

    try {
      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setIsPlaying(true);
    } catch (error) {
      console.error("Error resuming playback:", error);
    }
  };

  const nextTrack = async () => {
    const allTracks = tracksRef.current;
    if (allTracks.length === 0 || !currentTrack) return;

    const currentIndex = allTracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % allTracks.length;
    const next = allTracks[nextIndex];

    if (next) {
      await playTrack(next.uri);
    }
  };

  const previousTrack = async () => {
    const allTracks = tracksRef.current;
    if (allTracks.length === 0 || !currentTrack) return;

    const currentIndex = allTracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex =
      currentIndex <= 0 ? allTracks.length - 1 : currentIndex - 1;
    const prev = allTracks[prevIndex];

    if (prev) {
      await playTrack(prev.uri);
    }
  };

  const seekToPosition = async (position: number) => {
    const accessToken = Cookies.get("spotify_access_token");
    if (!accessToken) return;

    try {
      await fetch(
        `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(
          position
        )}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setCurrentTime(position);
    } catch (error) {
      console.error("Error seeking:", error);
    }
  };

  const setPlayerVolume = async (newVolume: number) => {
    setVolume(newVolume);
    const accessToken = Cookies.get("spotify_access_token");
    if (!accessToken) return;

    try {
      await fetch(
        `https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.floor(
          newVolume * 100
        )}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Error setting volume:", error);
    }
  };

  const value: SpotifyPlayerContextType = {
    player,
    deviceId,
    currentTrack,
    isPlaying,
    isPaused,
    currentTime,
    duration,
    volume,
    isReady,
    hasInitialized,
    playTrack,
    pausePlayback,
    resumePlayback,
    nextTrack,
    previousTrack,
    seekToPosition,
    setPlayerVolume,
    error,
  };

  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
