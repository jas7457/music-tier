"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import { PopulatedRound, PopulatedSubmission } from "./types";
import { getSpotifyDevices } from "./spotify";

// working url:     https://api.spotify.com/v1/me/player/play?device_id=84ba12cbec6088ef868f60f97ca1b1f6a4c9a140
// not working url: https://api.spotify.com/v1/me/player/play?device_id=baa7bbf1c2c8f54c444a1c917e6f1d00229d8e49

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
  hasNextTrack: boolean;
  hasPreviousTrack: boolean;
  playTrack: (trackUri: string, round?: PopulatedRound) => Promise<void>;
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
}

export function SpotifyPlayerProvider({
  children,
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
  const [playlist, setPlaylist] = useState<PopulatedSubmission["trackInfo"][]>(
    []
  );

  const currentTrackIndex = useMemo(() => {
    return playlist.findIndex(
      (t) =>
        t.trackId === currentTrack?.id ||
        t.trackId === currentTrack?.linked_from?.id
    );
  }, [playlist, currentTrack]);

  console.log({ currentTrackIndex, playlist, currentTrack });

  const hasNextTrack =
    playlist.length > 0 && currentTrackIndex < playlist.length - 1;
  const hasPreviousTrack = playlist.length > 0 && currentTrackIndex > 0;

  // Auto-refresh Spotify token before expiration
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      const expiresAt = Cookies.get("spotify_token_expires_at");
      if (!expiresAt) return;

      const expiresAtTime = parseInt(expiresAt, 10);
      const timeUntilExpiry = expiresAtTime - Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      const doRefresh = async () => {
        try {
          await fetch("/api/spotify/refresh", { method: "POST" });
        } catch (error) {
          setError(`Failed to refresh Spotify token, ${error}`);
          console.error("Failed to refresh Spotify token:", error);
        }
        checkAndRefreshToken();
      };

      // If token expires in less than 5 minutes, refresh it now
      if (timeUntilExpiry < fiveMinutes) {
        await doRefresh();
      } else {
        // Schedule refresh for 5 minutes before expiration
        const refreshTime = timeUntilExpiry - fiveMinutes;
        const timeoutId = setTimeout(async () => {
          await doRefresh();
        }, refreshTime);

        return () => clearTimeout(timeoutId);
      }
    };

    checkAndRefreshToken();
  }, []);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    const token = Cookies.get("spotify_access_token");
    if (!token) {
      setIsReady(false);
      setHasInitialized(true);
      return;
    }
    let spotifyPlayer: Spotify.Player;
    let stateTimeout: NodeJS.Timeout;
    let mounted = true;

    // after 3 seconds, assume it will not itialize
    const initializedTimeout = setTimeout(() => {
      setHasInitialized(true);
    }, 3_000);

    window.onSpotifyWebPlaybackSDKReady = () => {
      spotifyPlayer = new window.Spotify.Player({
        name: "Music Tier Player",
        getOAuthToken: (cb) => {
          const currentToken = Cookies.get("spotify_access_token");
          cb(currentToken || token);
        },
        volume: volume,
      });

      // Ready event - device is ready
      spotifyPlayer.addListener("ready", async ({ device_id }: any) => {
        console.log("Spotify Player Ready with Device ID:", device_id);
        clearTimeout(initializedTimeout);
        setHasInitialized(true);
        setDeviceId(device_id);
        setIsReady(true);
      });

      // Not Ready event - device has gone offline
      spotifyPlayer.addListener("not_ready", ({ device_id }: any) => {
        console.log("Spotify Player Not Ready with Device ID:", device_id);
        setHasInitialized(true);
        clearTimeout(initializedTimeout);
        setIsReady(false);
      });

      const updateWithNewState = (state: Spotify.WebPlaybackState | null) => {
        if (!state) return;
        const newTrack = state.track_window.current_track;
        setCurrentTrack(newTrack);
        setIsPaused(state.paused);
        setIsPlaying(!state.paused);
        setCurrentTime(state.position);
        setDuration(newTrack.duration_ms);
      };

      // Player state changed
      spotifyPlayer.addListener("player_state_changed", updateWithNewState);

      // Connect to the player
      spotifyPlayer.connect().then((success: boolean) => {
        if (success) {
          console.log("Spotify Player Connected");
          setPlayer(spotifyPlayer);
        }
      });

      const poll = async () => {
        clearTimeout(stateTimeout);
        stateTimeout = setTimeout(async () => {
          if (!mounted) {
            return;
          }
          const state = await spotifyPlayer.getCurrentState();
          updateWithNewState(state);
          poll();
        }, 1000);
      };

      poll();
    };

    // If SDK is already loaded, initialize immediately
    if (window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady();
    }

    return () => {
      mounted = false;
      clearTimeout(initializedTimeout);
      clearTimeout(stateTimeout);

      if (spotifyPlayer) {
        spotifyPlayer.disconnect();
      }
    };
  }, [volume]);

  const playTrack = async (
    trackUri: string,
    round?: PopulatedRound | "same"
  ) => {
    if (!deviceId) {
      setError("No Spotify device available");
      return;
    }

    const accessToken = Cookies.get("spotify_access_token");
    if (!accessToken) {
      setError("No Spotify access token");
      return;
    }

    const attemptPlay = async (
      deviceAttemptId = deviceId
    ): Promise<Response> => {
      return await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceAttemptId}`,
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
    };

    try {
      const response = await attemptPlay();
      if (!response.ok) {
        const deviceResponse = await getSpotifyDevices(accessToken);
        const thisDevice = deviceResponse.devices.find(
          (device: any) => deviceId === device.id
        );
        const musicTierPlayer = deviceResponse.devices.find(
          (device: any) => device.name === "Music Tier Player"
        );

        const order = [thisDevice?.id, musicTierPlayer?.id, deviceId].filter(
          Boolean
        );
        let idToSet: string | undefined = undefined;
        for (const id of order) {
          const retryResponse = await attemptPlay(id);
          if (retryResponse.ok) {
            idToSet = id;
            try {
              const trackInfo = await retryResponse.json();
              setCurrentTrack(trackInfo);
            } catch {
              // ignore json parse error
            }

            break;
          }
        }

        if (idToSet) {
          setDeviceId(idToSet);
        } else {
          throw new Error(
            `Failed to play track after retries: ${response.statusText}`
          );
        }
      } else {
        const trackInfo = await response.json();
        console.log("Track started playing:", trackInfo);
        setCurrentTrack(trackInfo);
      }

      setIsPlaying(true);
      setError(null);
      if (round) {
        if (round !== "same") {
          setPlaylist(
            round.submissions.map((submission) => submission.trackInfo)
          );
        }
      } else {
        setPlaylist([]);
      }
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
    const nextTrack = playlist[currentTrackIndex + 1];
    if (nextTrack) {
      playTrack(`spotify:track:${nextTrack.trackId}`, "same");
      return;
    }
  };

  const previousTrack = async () => {
    const previousTrack = playlist[currentTrackIndex - 1];
    if (previousTrack) {
      playTrack(`spotify:track:${previousTrack.trackId}`, "same");
      return;
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
    hasNextTrack,
    hasPreviousTrack,
    error,
  };

  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
