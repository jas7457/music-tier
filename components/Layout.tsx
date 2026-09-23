'use client';

import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';

import MusicPlayer from './MusicPlayer';
import { GameBoy } from './gameboy/GameBoy';
import { isChristmas } from '@/lib/utils/isChristmas';
import { useSpotifyPlayer } from '@/lib/SpotifyPlayerContext';
import { ToastViewport } from '@/lib/ToastContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const [hasSpotifyAccess, setHasSpotifyAccess] = useState(false);
  const [isMusicPlayerExpanded, setIsMusicPlayerExpanded] = useState(false);
  const { currentTrack } = useSpotifyPlayer();

  // Check for Spotify access token
  useEffect(() => {
    const checkSpotifyAccess = () => {
      const token = Cookies.get('spotify_access_token');
      setHasSpotifyAccess(!!token);
    };

    checkSpotifyAccess();
    // Check periodically in case token is added/removed
    const interval = setInterval(checkSpotifyAccess, 5000);
    return () => clearInterval(interval);
  }, []);

  const hasPlayer = hasSpotifyAccess && !!currentTrack;

  return (
    <GameBoy
      hasPlayer={hasPlayer}
      onSelect={() => setIsMusicPlayerExpanded((expanded) => !expanded)}
      overlay={
        <>
          {isChristmas() && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://media.cnn.com/api/v1/images/stellar/prod/201204114813-mariah-carey-christmas-special.jpg?q=w_3000,h_2000,x_0,y_0,c_fill')`,
              }}
            />
          )}
          {hasSpotifyAccess && (
            <MusicPlayer
              isExpanded={isMusicPlayerExpanded}
              setIsExpanded={setIsMusicPlayerExpanded}
            />
          )}
          <ToastViewport />
        </>
      }
    >
      <div className={hasPlayer ? 'gb-page gb-page-with-player' : 'gb-page'}>
        {children}
      </div>
    </GameBoy>
  );
}
