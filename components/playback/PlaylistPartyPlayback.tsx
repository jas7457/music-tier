'use client';

import { useState, useEffect, useRef, Activity } from 'react';
import { twMerge } from 'tailwind-merge';
import type { PopulatedLeague } from '@/lib/types';
import { useAuth } from '@/lib/AuthContext';
import { CdIcon } from '@/components/win98/Icons';
import { CloseGlyph, TitleBarButton } from '@/components/win98/Window';
import { PLAYBACK_SCREENS } from './screenConfig';

interface PlaylistPartyPlaybackProps {
  league: PopulatedLeague;
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistPartyPlayback({
  league,
  isOpen,
  onClose,
}: PlaylistPartyPlaybackProps) {
  const { user } = useAuth();
  const playback = league.playback;
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
        case ' ': // Spacebar
          e.preventDefault();
          if (currentScreenIndex < PLAYBACK_SCREENS.length - 1) {
            setCurrentScreenIndex((prev) => prev + 1);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentScreenIndex > 0) {
            setCurrentScreenIndex((prev) => prev - 1);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentScreenIndex, onClose]);

  // Sync scroll position when currentScreenIndex changes
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const targetScrollTop = currentScreenIndex * window.innerHeight;
    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
  }, [isOpen, currentScreenIndex]);

  // Scroll handling with snap
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    let isScrolling = false;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (isScrolling) return;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!containerRef.current) return;

        const scrollTop = containerRef.current.scrollTop;
        const screenHeight = window.innerHeight;
        const newIndex = Math.round(scrollTop / screenHeight);

        if (newIndex !== currentScreenIndex) {
          setCurrentScreenIndex(newIndex);
        }
      }, 50);
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isOpen, currentScreenIndex]);

  if (!isOpen || !playback || !user) return null;

  const currentUserId = user._id;

  const scrollToScreen = (index: number) => {
    setCurrentScreenIndex(index);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-200 bg-black overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Title bar — the show runs inside a window, like everything else */}
      <div className="fixed top-0 left-0 right-0 z-210 w98-titlebar">
        <CdIcon />
        <span className="grow truncate">
          Playlist Party Playback - Screen {currentScreenIndex + 1} of{' '}
          {PLAYBACK_SCREENS.length}
        </span>
        <TitleBarButton label="Close" onClick={onClose}>
          <CloseGlyph />
        </TitleBarButton>
      </div>

      {/* Progress indicator, drawn as a segmented trackbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-210 flex gap-0.5 w98-raised p-1">
        {PLAYBACK_SCREENS.map((screen, index) => (
          <button
            key={screen.key}
            onClick={() => scrollToScreen(index)}
            className={twMerge(
              'h-4 w-3',
              index === currentScreenIndex
                ? 'bg-primary shadow-w98-in-thin'
                : 'bg-w98-face shadow-w98-out-thin',
            )}
            aria-label={`Go to screen ${index + 1}`}
          />
        ))}
      </div>

      {/* Screens with stacking and scroll-driven animations */}
      {PLAYBACK_SCREENS.map((screen, index) => {
        const Screen = screen.component;
        const isActive = index === currentScreenIndex;
        const isExiting = index === currentScreenIndex - 1;
        const isActiveActivity = Math.abs(index - currentScreenIndex) <= 2;

        return (
          <div
            key={screen.key}
            className="h-screen w-screen snap-start snap-always relative"
          >
            <div className="h-full w-full overflow-hidden">
              <Activity mode={isActiveActivity ? 'visible' : 'hidden'}>
                <Screen
                  playback={playback}
                  league={league}
                  currentUserId={currentUserId}
                  isActive={isActive}
                  isExiting={isExiting}
                />
              </Activity>
            </div>
          </div>
        );
      })}

      {/* CSS animations for screen transitions */}
      <style jsx>{`
        @keyframes screen-enter {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes screen-exit {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
}
