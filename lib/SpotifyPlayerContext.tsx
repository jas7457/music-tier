"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Cookies from "js-cookie";
import { PopulatedRound, PopulatedSubmission } from "./types";
import { useToast } from "./ToastContext";
import { APP_NAME } from "./utils/constants";
import { unknownToErrorString } from "./utils/unknownToErrorString";
import { useAuth } from "./AuthContext";

const SPOTIFY_PLAYER_NAME = APP_NAME;

interface SpotifyPlayerContextType {
  currentTrack: Spotify.WebPlaybackTrack | null;
  isPlaying: boolean;
  hasNextTrack: boolean;
  hasPreviousTrack: boolean;
  playlist: PopulatedSubmission[];
  currentTrackIndex: number;
  playlistRound: PopulatedRound | null;
  isDisabled: boolean;
  registerTimeUpdate: (callback: (time: number) => void) => () => void;
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
  const { user } = useAuth();
  const [currentTrack, setCurrentTrack] =
    useState<Spotify.WebPlaybackTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_timeListeners, setTimeListeners] = useState<
    Array<(time: number) => void>
  >([]);
  const [{ playlist, round: playlistRound }, setPlaylist] = useState<{
    round: PopulatedRound | null;
    playlist: PopulatedSubmission[];
  }>({ playlist: [], round: null });
  const hasInitializedRef = useRef(false);
  const hasPreviouslyPlayedRef = useRef(false);
  const deviceIdRef = useRef<string | null>(null);
  const setupPromiseRef = useRef<Promise<string> | null>(null);
  const toast = useToast();
  const currentTrackIndex = useMemo(() => {
    if (!currentTrack || playlist.length === 0) {
      return -1;
    }
    return playlist.findIndex((submission) => {
      if (currentTrack.id === submission.trackInfo.trackId) {
        return true;
      }
      if (currentTrack.linked_from?.id === submission.trackInfo.trackId) {
        return true;
      }
      return false;
    });
  }, [playlist, currentTrack]);
  const currentTrackIndexRef = useRef(currentTrackIndex);
  currentTrackIndexRef.current = currentTrackIndex;

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
        return data;
      } catch {
      } finally {
        return { success: true };
      }
    } catch (error) {
      const errorMessage = unknownToErrorString(
        error,
        "Error refreshing Spotify token"
      );
      toast.show({
        title: "Error refreshing Spotify token",
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

  const value: SpotifyPlayerContextType = useMemo(() => {
    const updateWithNewState = (state: Spotify.WebPlaybackState | null) => {
      if (!state) {
        return;
      }

      const newTrack = state.track_window.current_track;
      setCurrentTrack((currentTrack) => {
        if (currentTrack && currentTrack.id === newTrack.id) {
          return currentTrack;
        }
        return newTrack;
      });
      setIsPlaying(!state.paused);
      setTimeListeners((listeners) => {
        listeners.forEach((callback) => callback(state.position));
        return listeners;
      });
    };
    const setupPlayer = async (): Promise<string> => {
      // we've already set it up...
      if (setupPromiseRef.current) {
        return setupPromiseRef.current;
      }

      const token = Cookies.get("spotify_access_token");
      if (!token) {
        return "";
      }

      let stateTimeout: NodeJS.Timeout;

      const setupPromise = new Promise<string>((resolve) => {
        window.onSpotifyWebPlaybackSDKReady = () => {
          const resolveTimeout = setTimeout(() => {
            resolveWithNothing();
          }, 5_000);

          const resolveWithNothing = () => {
            resolve("");
            clearTimeout(resolveTimeout);
          };

          const spotifyPlayer = new window.Spotify.Player({
            name: SPOTIFY_PLAYER_NAME,
            // @ts-ignore
            enableMediaSession: true,
            getOAuthToken: (cb) => {
              const currentToken = Cookies.get("spotify_access_token");
              cb(currentToken || token);
            },
            volume: 1,
          });

          // Ready event - device is ready
          spotifyPlayer.addListener("ready", async ({ device_id }) => {
            console.log("Spotify Player Ready with Device ID:", device_id);
            deviceIdRef.current = device_id;
            resolve(device_id);
            clearTimeout(resolveTimeout);
          });

          // Not Ready event - device has gone offline
          spotifyPlayer.addListener("not_ready", () => {
            const errorMessage = "Spotify Player went offline";
            toast.show({ message: errorMessage, variant: "error" });
            resolveWithNothing();
          });

          spotifyPlayer.addListener("initialization_error", ({ message }) => {
            const errorMessage = unknownToErrorString(
              message,
              "Spotify Initialization Error"
            );
            toast.show({ message: errorMessage, variant: "error" });
            resolveWithNothing();
          });

          spotifyPlayer.addListener("authentication_error", ({ message }) => {
            const errorMessage = unknownToErrorString(
              message,
              "Spotify Authentication Error"
            );
            toast.show({ message: errorMessage, variant: "error" });
            resolveWithNothing();
          });

          spotifyPlayer.addListener("account_error", ({ message }) => {
            const errorMessage = unknownToErrorString(
              message,
              "Spotify Account Error"
            );
            toast.show({ message: errorMessage, variant: "error" });
            resolveWithNothing();
          });

          // Player state changed
          spotifyPlayer.addListener("player_state_changed", updateWithNewState);

          // Connect to the player
          spotifyPlayer.connect().then((success: boolean) => {
            if (!success) {
              resolveWithNothing();
              toast.show({
                message: "Failed to connect to Spotify Player",
                variant: "error",
              });
            }
          });

          const poll = async () => {
            clearTimeout(stateTimeout);
            stateTimeout = setTimeout(async () => {
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

      setupPromiseRef.current = setupPromise;
      return setupPromise;
    };

    const playTrack = async (
      submission: PopulatedSubmission,
      round: PopulatedRound | "same"
    ) => {
      const deviceId = await setupPlayer();
      hasPreviouslyPlayedRef.current = true;
      if (!submission) {
        return;
      }
      if (!deviceId) {
        const errorMessage = "No Spotify device available";
        toast.show({
          message: errorMessage,
          variant: "error",
        });
        return;
      }

      const accessToken = Cookies.get("spotify_access_token");
      if (!accessToken) {
        const errorMessage = "No Spotify access token";
        toast.show({
          message: errorMessage,
          variant: "error",
        });
        return;
      }

      try {
        const playlistInfo =
          round === "same"
            ? { playlist, round: playlistRound }
            : {
                playlist: getPlaylistForRound({ round, userId: user?._id }),
                round,
              };

        const hasSong = playlistInfo.playlist.find(
          (sub) => sub._id === submission._id
        );
        if (!hasSong) {
          playlistInfo.playlist.unshift(submission);
        }

        const uris = playlistInfo.playlist.map(
          (sub) => `spotify:track:${sub.trackInfo.trackId}`
        );

        const trackUri = `spotify:track:${submission.trackInfo.trackId}`;
        const offset = uris.indexOf(trackUri);

        const response = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris,
              offset: { position: offset === -1 ? 0 : offset },
            }),
          }
        );

        if (!response.ok) {
          setIsPlaying(false);
          toast.show({
            message: `Spotify API error: ${response.status} ${response.statusText}`,
            variant: "error",
          });
          setCurrentTrack(null);
          setPlaylist({ playlist: [], round: null });
          return;
        }

        setIsPlaying(true);
        setPlaylist(playlistInfo);
      } catch (error) {
        const message = unknownToErrorString(
          error,
          "Failed to play track. Make sure you have Spotify Premium."
        );
        toast.show({
          message,
          variant: "error",
        });
      }
    };
    return {
      currentTrack,
      isPlaying,
      hasNextTrack,
      hasPreviousTrack,
      playlist,
      currentTrackIndex,
      playlistRound,
      isDisabled: false,
      playTrack,
      pausePlayback: async () => {
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
          const message = unknownToErrorString(error, "Error pausing playback");
          toast.show({
            message,
            variant: "error",
          });
        }
      },
      resumePlayback: async () => {
        if (!hasPreviouslyPlayedRef.current) {
          return playTrack(playlist[currentTrackIndexRef.current], "same");
        }
        const accessToken = Cookies.get("spotify_access_token");
        if (!accessToken) {
          return;
        }

        try {
          await fetch("https://api.spotify.com/v1/me/player/play", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          setIsPlaying(true);
        } catch (error) {
          const message = unknownToErrorString(
            error,
            "Error resuming playback"
          );
          toast.show({
            message,
            variant: "error",
          });
        }
      },
      nextTrack: async () => {
        const nextTrack = playlist[currentTrackIndexRef.current + 1];
        if (nextTrack) {
          playTrack(nextTrack, "same");
        }
      },
      previousTrack: async () => {
        const previousTrack = playlist[currentTrackIndexRef.current - 1];
        if (previousTrack) {
          playTrack(previousTrack, "same");
        }
      },
      seekToPosition: async (position: number) => {
        const accessToken = Cookies.get("spotify_access_token");
        if (!accessToken) {
          return;
        }

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
          setTimeListeners((listeners) => {
            listeners.forEach((callback) => callback(position));
            return listeners;
          });
        } catch (error) {
          const message = unknownToErrorString(error, "Error seeking");
          toast.show({
            message,
            variant: "error",
          });
        }
      },
      initializePlaylist: async (round: PopulatedRound) => {
        if (hasInitializedRef.current) {
          return;
        }
        hasInitializedRef.current = true;
        const playlist = getPlaylistForRound({ round, userId: user?._id });
        setPlaylist((current) => {
          if (current.round) {
            return current;
          }
          return {
            round,
            playlist,
          };
        });
        const track = playlist[0]?.trackInfo;
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
          setIsPlaying(false);
          setTimeListeners((listeners) => {
            listeners.forEach((callback) => callback(0));
            return listeners;
          });
        } catch (err) {
          const message = unknownToErrorString(
            err,
            "Error initializing playlist"
          );
          toast.show({
            title: "Error initializing playlist",
            variant: "error",
            message,
          });
        }
      },
      registerTimeUpdate: (callback: (time: number) => void) => {
        setTimeListeners((listeners) => [...listeners, callback]);
        return () => {
          setTimeListeners((listeners) =>
            listeners.filter((cb) => cb !== callback)
          );
        };
      },
    };
  }, [
    currentTrack,
    currentTrackIndex,
    hasNextTrack,
    hasPreviousTrack,
    isPlaying,
    playlist,
    playlistRound,
    toast,
    user?._id,
  ]);

  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}

function getPlaylistForRound({
  round,
  userId,
}: {
  round: PopulatedRound;
  userId: string | undefined;
}) {
  return round.submissions.filter((submission) => {
    switch (round.stage) {
      case "completed":
      case "voting":
      case "currentUserVotingCompleted": {
        return true;
      }
      default: {
        return submission.userId === userId;
      }
    }
  });
}
