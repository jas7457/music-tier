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
      return;
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "Music Tier Player",
        getOAuthToken: (cb) => cb(token),
        volume: volume,
      });

      // Ready event - device is ready
      spotifyPlayer.addListener("ready", ({ device_id }: any) => {
        console.log("Spotify Player Ready with Device ID:", device_id);
        setDeviceId(device_id);
        setIsReady(true);
      });

      // Not Ready event - device has gone offline
      spotifyPlayer.addListener("not_ready", ({ device_id }: any) => {
        console.log("Spotify Player Not Ready with Device ID:", device_id);
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
      if (player) {
        player.disconnect();
      }
    };
  }, []);

  // Update current time position while playing
  useEffect(() => {
    if (!isPlaying || !player || !currentTrack) return;

    const interval = setInterval(async () => {
      try {
        const state = await player.getCurrentState();
        if (state && state.track_window.current_track) {
          setCurrentTime(state.position);
        }
      } catch (error) {
        console.error("Error getting current state:", error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, player, currentTrack]);

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
    if (player) {
      await player.pause();
      setIsPlaying(false);
    }
  };

  const resumePlayback = async () => {
    if (player) {
      await player.resume();
      setIsPlaying(true);
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
    if (player) {
      await player.seek(position);
    }
  };

  const setPlayerVolume = async (newVolume: number) => {
    setVolume(newVolume);
    if (player) {
      await player.setVolume(newVolume);
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
