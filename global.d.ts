/// <reference types="./types/spotify-web-playback-sdk" />

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: Spotify.PlayerOptions) => Spotify.Player;
    };
  }
}

export {};
