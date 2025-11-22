"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import Cookies from "js-cookie";
import { PopulatedRound, PopulatedSubmission } from "./types";
import { useToast } from "./ToastContext";
import { APP_NAME } from "./utils/constants";

// working url:     https://api.spotify.com/v1/me/player/play?device_id=84ba12cbec6088ef868f60f97ca1b1f6a4c9a140
// not working url: https://api.spotify.com/v1/me/player/play?device_id=baa7bbf1c2c8f54c444a1c917e6f1d00229d8e49

const SPOTIFY_PLAYER_NAME = APP_NAME;

interface SpotifyPlayerContextType {
  player: Spotify.Player | null;
  currentTrack: Spotify.WebPlaybackTrack | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
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
  initializePlaylist: (round: PopulatedRound) => void;
  isDisabled: boolean;
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
  const hasInitializedRef = useRef(false);
  const hasPreviouslyPlayedRef = useRef(false);
  const hasSetupPlayerRef = useRef(false);
  const toast = useToast();

  const hasNextTrack =
    playlist.length > 0 && currentTrackIndex < playlist.length - 1;
  const hasPreviousTrack = playlist.length > 0 && currentTrackIndex > 0;

  const refreshToken = useCallback(async (): Promise<{ success: boolean }> => {
    const refreshToken = Cookies.get("spotify_refresh_token");
    if (!refreshToken) {
      return { success: false };
    }
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
        return data;
      } catch {
      } finally {
        return { success: true };
      }
    } catch (error) {
      const errorMessage = `Failed to refresh Spotify token, ${error}`;
      setError(errorMessage);
      toast.show({
        message: errorMessage,
        variant: "error",
      });
      return { success: false };
    }
  }, [toast]);

  // Auto-refresh Spotify token before expiration
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    async function setup() {
      const checkAndRefreshToken = async () => {
        const expiresAt = Cookies.get("spotify_token_expires_at");
        const currentRefreshToken = Cookies.get("spotify_refresh_token");
        if (!expiresAt) {
          if (currentRefreshToken) {
            await refreshToken();
            return checkAndRefreshToken();
          }
          return;
        }

        const expiresAtTime = parseInt(expiresAt, 10);
        const timeUntilExpiry = expiresAtTime - Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        // If token expires in less than 5 minutes, refresh it now
        if (timeUntilExpiry < fiveMinutes) {
          await refreshToken();
          checkAndRefreshToken();
        } else {
          // Schedule refresh for 5 minutes before expiration
          const refreshTime = timeUntilExpiry - fiveMinutes;
          clearTimeout(timeoutId);
          timeoutId = setTimeout(async () => {
            await refreshToken();
            checkAndRefreshToken();
          }, refreshTime);
        }
      };

      checkAndRefreshToken();
    }
    setup();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [refreshToken]);

  const updateWithNewState = useCallback(
    (state: Spotify.WebPlaybackState | null) => {
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
    },
    []
  );

  const setupPlayer = useCallback(async (): Promise<string> => {
    // we've already set it up...
    if (hasSetupPlayerRef.current) {
      return deviceId || "";
    }

    const token = Cookies.get("spotify_access_token");
    if (!token) {
      setIsReady(false);
      setHasInitialized(true);
      return deviceId || "";
    }

    hasSetupPlayerRef.current = true;
    let stateTimeout: NodeJS.Timeout;

    // after 3 seconds, assume it will not itialize
    const initializedTimeout = setTimeout(() => {
      setHasInitialized(true);
    }, 3_000);

    return new Promise<string>((resolve) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        const spotifyPlayer = new window.Spotify.Player({
          name: SPOTIFY_PLAYER_NAME,
          getOAuthToken: (cb) => {
            const currentToken = Cookies.get("spotify_access_token");
            cb(currentToken || token);
          },
          volume: 1,
        });

        // Ready event - device is ready
        spotifyPlayer.addListener("ready", async ({ device_id }) => {
          console.log("Spotify Player Ready with Device ID:", device_id);
          clearTimeout(initializedTimeout);
          setHasInitialized(true);
          setDeviceId(device_id);
          setIsReady(true);
          resolve(device_id);
        });

        // Not Ready event - device has gone offline
        spotifyPlayer.addListener("not_ready", ({ device_id }) => {
          console.log("Spotify Player Not Ready with Device ID:", device_id);
          setHasInitialized(true);
          clearTimeout(initializedTimeout);
          setIsReady(false);
        });

        spotifyPlayer.addListener("initialization_error", ({ message }) => {
          setError(message);
        });

        spotifyPlayer.addListener("authentication_error", ({ message }) => {
          setError(message);
        });

        spotifyPlayer.addListener("account_error", ({ message }) => {
          setError(message);
        });

        // Player state changed
        spotifyPlayer.addListener("player_state_changed", updateWithNewState);

        // Connect to the player
        spotifyPlayer.connect().then((success: boolean) => {
          if (success) {
            console.log("Spotify Player Connected");
            setPlayer(spotifyPlayer);
            setError(null);
          } else {
            setPlayer(null);
            setError("Failed to connect to Spotify Player");
          }
        });

        const poll = async () => {
          clearTimeout(stateTimeout);
          stateTimeout = setTimeout(async () => {
            console.log("polling for spotify player state");
            const state = await spotifyPlayer.getCurrentState();
            updateWithNewState(state);
            poll();
          }, 1000);
        };

        poll();
      };

      if (window.Spotify) {
        window.onSpotifyWebPlaybackSDKReady();
      }
    });
  }, [deviceId, updateWithNewState]);

  const initializePlaylist = useCallback(async (round: PopulatedRound) => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;
    setPlaylist((current) => {
      if (current.round) {
        return current;
      }
      return { currentTrackIndex: 0, round, playlist: round.submissions };
    });
    const track = round.submissions[0]?.trackInfo;
    if (!track) {
      return;
    }

    const token = Cookies.get("spotify_access_token");
    if (!token) {
      return;
    }
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${track.trackId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      setCurrentTrack(data);
      setIsPaused(true);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(data.duration_ms);
    } catch {}
  }, []);

  const playTrack = async (
    submission: PopulatedSubmission,
    round?: PopulatedRound | "same"
  ) => {
    const deviceId = await setupPlayer();
    hasPreviouslyPlayedRef.current = true;
    if (!submission) {
      return;
    }
    if (!deviceId) {
      const errorMessage = "No Spotify device available";
      setError(errorMessage);
      toast.show({
        message: errorMessage,
        variant: "error",
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
      });
      return;
    }

    const attemptPlay = async (
      deviceAttemptId = deviceId
    ): Promise<Response> => {
      const body = JSON.stringify({
        uris: [trackUri],
      });
      console.log({ body });
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
        setIsPlaying(false);
        setError(
          `Spotify API error: ${response.status} ${response.statusText}`
        );
        setCurrentTrack(null);
        setPlaylist({ playlist: [], currentTrackIndex: -1, round: null });
        return;
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
    if (!hasPreviouslyPlayedRef.current) {
      return playTrack(playlist[currentTrackIndex], "same");
    }
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

  const value: SpotifyPlayerContextType = {
    player,
    currentTrack,
    isPlaying,
    isPaused,
    currentTime,
    duration,
    isReady,
    hasInitialized,
    playTrack,
    pausePlayback,
    resumePlayback,
    nextTrack,
    previousTrack,
    seekToPosition,
    initializePlaylist,
    hasNextTrack,
    hasPreviousTrack,
    error,
    playlist,
    currentTrackIndex,
    playlistRound,
    isDisabled: false,
  };

  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
