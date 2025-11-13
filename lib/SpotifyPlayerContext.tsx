"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import { PopulatedRound, PopulatedSubmission } from "./types";
import { getSpotifyDevices } from "./spotify";
import { useToast } from "./ToastContext";

// working url:     https://api.spotify.com/v1/me/player/play?device_id=84ba12cbec6088ef868f60f97ca1b1f6a4c9a140
// not working url: https://api.spotify.com/v1/me/player/play?device_id=baa7bbf1c2c8f54c444a1c917e6f1d00229d8e49

const SPOTIFY_PLAYER_NAME = "Music League Now!";

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
  playlist: PopulatedSubmission[];
  currentTrackIndex: number;
  playlistRound: PopulatedRound | null;
  playTrack: (
    submission: PopulatedSubmission,
    round: PopulatedRound | "same"
  ) => Promise<void>;
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
  const [{ playlist, currentTrackIndex, round: playlistRound }, setPlaylist] =
    useState<{
      round: PopulatedRound | null;
      playlist: PopulatedSubmission[];
      currentTrackIndex: number;
    }>({ playlist: [], currentTrackIndex: -1, round: null });
  const lastPlaybackStateRef = useRef<Spotify.WebPlaybackState | null>(null);
  const nextTrackRef = useRef<() => void>(() => {});
  const toast = useToast();

  const hasNextTrack =
    playlist.length > 0 && currentTrackIndex < playlist.length - 1;
  const hasPreviousTrack = playlist.length > 0 && currentTrackIndex > 0;

  // Auto-refresh Spotify token before expiration
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      const doRefresh = async () => {
        try {
          const response = await fetch("/api/spotify/refresh", {
            method: "POST",
          });
          if (!response.ok) {
            throw new Error(`${response.status} error: ${response.statusText}`);
          }
          try {
            const data = await response.json();
            if (data.success) {
              setHasInitialized(true);
            }
          } catch {}
        } catch (error) {
          const errorMessage = `Failed to refresh Spotify token, ${error}`;
          setError(errorMessage);
          toast.show({
            message: errorMessage,
            variant: "error",
            dismissible: true,
            timeout: 5000,
          });
          console.error("Failed to refresh Spotify token:", error);
        }
        checkAndRefreshToken();
      };

      const expiresAt = Cookies.get("spotify_token_expires_at");
      const currentToken = Cookies.get("spotify_access_token");
      if (!expiresAt || !currentToken) {
        debugger;
        try {
          await doRefresh();
        } catch {}
        return;
      }

      const expiresAtTime = parseInt(expiresAt, 10);
      const timeUntilExpiry = expiresAtTime - Date.now();
      const fiveMinutes = 5 * 60 * 1000;

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
  }, [toast]);

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
        name: SPOTIFY_PLAYER_NAME,
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
        const currentCallbackState = lastPlaybackStateRef.current;
        lastPlaybackStateRef.current = state;
        if (!state) {
          return;
        }
        const shouldPlayNextTrack = (() => {
          if (!currentCallbackState) {
            return false;
          }
          if (currentCallbackState.paused) {
            return false;
          }
          if (!state.paused) {
            return false;
          }
          const currentTrack = currentCallbackState.track_window.current_track;
          const timeLeft =
            currentTrack.duration_ms - currentCallbackState.position;
          console.log(timeLeft);
          if (timeLeft < 2000) {
            return true;
          }
          return false;
        })();

        if (shouldPlayNextTrack) {
          nextTrackRef.current();
          return;
        }

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
    submission: PopulatedSubmission,
    round?: PopulatedRound | "same"
  ) => {
    if (!deviceId) {
      const errorMessage = "No Spotify device available";
      setError(errorMessage);
      toast.show({
        message: errorMessage,
        variant: "error",
        dismissible: true,
        timeout: 5000,
      });
      return;
    }

    const trackUri = `spotify:track:${submission.trackInfo.trackId}`;

    const accessToken = Cookies.get("spotify_access_token");
    if (!accessToken) {
      const errorMessage = "No Spotify access token";
      setError(errorMessage);
      toast.show({
        message: errorMessage,
        variant: "error",
        dismissible: true,
        timeout: 5000,
      });
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
          (device: any) => device.name === SPOTIFY_PLAYER_NAME
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
        try {
          const trackInfo = await response.json();
          console.log("Track started playing:", trackInfo);
          setCurrentTrack(trackInfo);
        } catch {
          // ignore json parse error
        }
      }

      setIsPlaying(true);
      setError(null);
      if (round) {
        const info =
          round === "same"
            ? { playlist, round: playlistRound }
            : { playlist: round.submissions, round };

        const trackIndex = info.playlist.findIndex(
          (submission) =>
            submission.trackInfo.trackId ===
            trackUri.replace("spotify:track:", "")
        );

        setPlaylist({
          ...info,
          currentTrackIndex: trackIndex,
        });
      } else {
        setPlaylist({ playlist: [], currentTrackIndex: -1, round: null });
      }
    } catch (error) {
      console.error("Error playing track:", error);
      const errorMessage =
        "Failed to play track. Make sure you have Spotify Premium.";
      setError(errorMessage);
      toast.show({
        message: errorMessage,
        variant: "error",
        dismissible: true,
        timeout: 5000,
      });
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
      playTrack(nextTrack, "same");
      return;
    }
  };
  nextTrackRef.current = nextTrack;

  const previousTrack = async () => {
    const previousTrack = playlist[currentTrackIndex - 1];
    if (previousTrack) {
      playTrack(previousTrack, "same");
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
    playlist,
    currentTrackIndex,
    playlistRound,
  };

  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
