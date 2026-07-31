'use client';

import { useState, useRef, useEffect } from 'react';
import { useSpotifyPlayer } from '@/lib/SpotifyPlayerContext';
import { PlayIcon, PauseIcon, NextIcon, PreviousIcon } from './PlayerIcons';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';
import { HapticButton } from './HapticButton';
import { CdIcon, MusicIcon, VolumeIcon } from './win98/Icons';
import { CloseGlyph, MinimizeGlyph, TitleBarButton } from './win98/Window';

/** Transport buttons were square, bevelled and 24px — never circular. */
function TransportButton({
  onClick,
  disabled,
  title,
  children,
  className,
}: {
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <HapticButton
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={twMerge(
        'w98-btn !min-w-0 w-9 h-8 !p-0 text-black touch-auto',
        className,
      )}
    >
      {children}
    </HapticButton>
  );
}

/** The time readout: black-on-green, like every hardware transport of the era. */
function TimeDisplay({ children }: { children: React.ReactNode }) {
  return (
    <span className="w98-sunken-thin bg-black text-[#00ff00] font-mono text-xs px-1.5 py-0.5 tabular-nums">
      {children}
    </span>
  );
}

export default function MusicPlayer({
  isExpanded,
  setIsExpanded,
  isMinimized,
  setIsMinimized,
}: {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  /** Minimized to the taskbar — the player keeps playing, it just isn't shown. */
  isMinimized: boolean;
  setIsMinimized: (minimized: boolean) => void;
}) {
  const {
    currentTrack,
    isPlaying,
    isDisabled,
    pausePlayback,
    resumePlayback,
    nextTrack,
    previousTrack,
    seekToPosition,
    playTrack,
    registerTimeUpdate,
    hasNextTrack,
    hasPreviousTrack,
    playlist,
    currentTrackIndex,
    playlistRound,
  } = useSpotifyPlayer();

  const [showPlaylist, setShowPlaylist] = useState(false);
  const playlistRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);

  // Register time update listener
  useEffect(() => {
    return registerTimeUpdate(setCurrentTime);
  }, [registerTimeUpdate]);

  // Close playlist when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        playlistRef.current &&
        !playlistRef.current.contains(event.target as Node)
      ) {
        setShowPlaylist(false);
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowPlaylist(false);
        setIsExpanded(false);
      }
    }

    if (showPlaylist || isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [showPlaylist, isExpanded, setIsExpanded]);

  // Reset drag state when page loses visibility or focus (e.g., iOS app switcher)
  useEffect(() => {
    const resetDragState = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragY(0);
      }
    };

    document.addEventListener('visibilitychange', resetDragState);
    window.addEventListener('blur', resetDragState);

    return () => {
      document.removeEventListener('visibilitychange', resetDragState);
      window.removeEventListener('blur', resetDragState);
    };
  }, [isDragging]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't start drag on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.closest('button') ||
      target.closest('input')
    ) {
      return;
    }

    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = dragStartY.current - currentY;

    // Only allow upward drag when collapsed
    if (!isExpanded && deltaY > 0) {
      e.preventDefault(); // Prevent page scroll
      setDragY(deltaY);
    }
    // Allow downward drag when expanded
    else if (isExpanded && deltaY < 0) {
      e.preventDefault(); // Prevent page scroll
      setDragY(Math.abs(deltaY));
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    const dragDuration = Date.now() - dragStartTime.current;
    const velocity = dragY / dragDuration;

    if (!isExpanded) {
      // Expand if dragged more than 100px or if flicked up quickly
      if (dragY > 100 || velocity > 0.5) {
        setIsExpanded(true);
      }
    } else {
      // Close if dragged down more than 100px or flicked down quickly
      if (dragY > 100 || velocity > 0.5) {
        setIsExpanded(false);
      }
    }

    // Reset drag state
    setIsDragging(false);
    setDragY(0);
  };

  if (!currentTrack) {
    return null;
  }

  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  };

  const artistNames = currentTrack.artists
    .map((artist) => artist.name)
    .join(', ');

  /* The playlist, drawn as a ListView of tracks. */
  const playlistPanel = (className: string) =>
    showPlaylist &&
    playlist.length > 0 && (
      <div className={twMerge('w98-window', className)}>
        <div className="w98-titlebar">
          <MusicIcon />
          <span className="grow truncate">Playlist ({playlist.length})</span>
          <TitleBarButton label="Close" onClick={() => setShowPlaylist(false)}>
            <CloseGlyph />
          </TitleBarButton>
        </div>

        {playlistRound && (
          <div className="w98-menubar">
            <Link
              href={`/leagues/${playlistRound.leagueId}/rounds/${playlistRound._id}`}
              className="w98-menuitem !w-auto no-underline text-black"
              onClick={() => setShowPlaylist(false)}
            >
              View Round
            </Link>
          </div>
        )}

        <div className="w98-paper mt-0.5 max-h-72 overflow-y-auto p-0.5">
          {playlist.map((trackInfo, index) => {
            const isCurrentTrack = index === currentTrackIndex;
            return (
              <button
                key={trackInfo.trackId}
                onClick={() => playTrack({ trackInfo, round: 'same' })}
                disabled={isDisabled}
                className={twMerge(
                  'w-full px-1 py-0.5 flex items-center gap-2 text-left',
                  isCurrentTrack ? 'w98-selected' : 'hover:bg-w98-face',
                )}
              >
                <span className="flex-none w-5 text-right text-xs tabular-nums">
                  {index + 1}.
                </span>
                <img
                  src={trackInfo.albumImageUrl}
                  alt=""
                  className="w-8 h-8 object-cover shadow-w98-out-thin flex-none"
                />
                <span className="min-w-0 grow">
                  <span className="block text-sm truncate font-bold">
                    {trackInfo.title}
                  </span>
                  <span className="block text-xs truncate">
                    {trackInfo.artists.join(', ')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );

  const seekBar = (
    <input
      type="range"
      className="w-full touch-auto"
      min="0"
      max={currentTrack.duration_ms || 0}
      value={currentTime}
      onChange={(e) => seekToPosition(Number(e.target.value))}
      disabled={isDisabled}
      aria-label="Seek"
    />
  );

  // Minimized: the window is gone from the desktop but still on the taskbar,
  // and playback carries on. Only the full-screen view can bring it back.
  if (isMinimized && !isExpanded) {
    return null;
  }

  return (
    <div ref={playlistRef}>
      {/* ---------------------------------------------- Mobile: docked bar */}
      <div className="md:hidden fixed bottom-[30px] left-0 right-0 z-90 w-screen">
        {playlistPanel('absolute bottom-full left-1 right-1 mb-1')}

        <div
          onClick={() => !isDragging && setIsExpanded(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w98-raised p-1 touch-none"
        >
          <div className="flex items-center gap-2">
            <img
              src={currentTrack.album.images[0]?.url}
              alt=""
              className="w-9 h-9 object-cover shadow-w98-out-thin flex-none"
            />

            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">
                {currentTrack.name}
              </div>
              <div className="text-xs truncate">{artistNames}</div>
            </div>

            <TransportButton
              title="Playlist"
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylist(!showPlaylist);
              }}
              disabled={playlist.length === 0}
            >
              <MusicIcon />
            </TransportButton>

            <TransportButton
              title={isPlaying ? 'Pause' : 'Play'}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              disabled={isDisabled}
            >
              {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </TransportButton>
          </div>
        </div>
      </div>

      {/* ------------------------------------------ Mobile: full-screen app */}
      <div
        className={twMerge(
          'md:hidden fixed inset-0 z-100 touch-none overflow-hidden bg-w98-desktop p-1 pb-[34px]',
          !isDragging && 'transition-transform duration-200 ease-out',
          !isDragging && (isExpanded ? 'translate-y-0' : 'translate-y-full'),
          !isExpanded && !isDragging && 'pointer-events-none',
        )}
        style={
          isDragging && !isExpanded
            ? { transform: `translateY(calc(100% - ${dragY}px))` }
            : isDragging && isExpanded
              ? { transform: `translateY(${dragY}px)` }
              : undefined
        }
        onTouchStart={isExpanded ? handleTouchStart : undefined}
        onTouchMove={isExpanded ? handleTouchMove : undefined}
        onTouchEnd={isExpanded ? handleTouchEnd : undefined}
      >
        <div className="w98-window h-full flex flex-col">
          <div className="w98-titlebar flex-none">
            <CdIcon />
            <span className="grow truncate">
              {currentTrack.name} - Media Player
            </span>
            <TitleBarButton
              label="Minimize"
              onClick={() => setIsExpanded(false)}
            >
              <MinimizeGlyph />
            </TitleBarButton>
            <TitleBarButton label="Close" onClick={() => setIsExpanded(false)}>
              <CloseGlyph />
            </TitleBarButton>
          </div>

          <div className="grow min-h-0 flex flex-col gap-3 p-2 mt-0.5">
            {/* Album art in a sunken display well */}
            <div className="grow min-h-0 w98-sunken bg-black flex items-center justify-center p-1">
              <img
                src={currentTrack.album.images[0]?.url}
                alt="Current track"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="w98-paper p-2 text-center">
              <div className="font-bold text-lg truncate">
                {currentTrack.name}
              </div>
              <div className="truncate">{artistNames}</div>
              <div className="text-sm truncate">{currentTrack.album.name}</div>
            </div>

            <div>
              {seekBar}
              <div className="flex justify-between items-center">
                <TimeDisplay>{formatTime(currentTime)}</TimeDisplay>
                <TimeDisplay>
                  {formatTime(currentTrack.duration_ms || 0)}
                </TimeDisplay>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1 pb-1">
              <TransportButton
                title="Previous track"
                onClick={previousTrack}
                disabled={isDisabled || !hasPreviousTrack}
                className="w-12 h-10"
              >
                <PreviousIcon size={20} />
              </TransportButton>
              <TransportButton
                title={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
                disabled={isDisabled}
                className="w-14 h-10"
              >
                {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
              </TransportButton>
              <TransportButton
                title="Next track"
                onClick={nextTrack}
                disabled={isDisabled || !hasNextTrack}
                className="w-12 h-10"
              >
                <NextIcon size={20} />
              </TransportButton>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ Desktop: docked */}
      <div className="hidden md:block fixed bottom-[30px] left-0 right-0 z-90 w-screen">
        <div className="w98-raised p-1">
          {/* Its own title bar, so minimizing it is discoverable from the
              window itself and not only from the taskbar button. */}
          <div className="w98-titlebar mb-1">
            <CdIcon />
            <span className="grow truncate">
              {currentTrack.name} - Media Player
            </span>
            <TitleBarButton
              label="Minimize"
              onClick={() => setIsMinimized(true)}
            >
              <MinimizeGlyph />
            </TitleBarButton>
          </div>

          <div className="flex gap-3 items-center">
            {/* Now playing */}
            <div className="flex items-center gap-2 min-w-0 w-64 max-w-[30%]">
              <img
                src={currentTrack.album.images[0]?.url}
                alt="Current track"
                className="w-11 h-11 object-cover shadow-w98-out-thin flex-none"
              />
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">
                  {currentTrack.name}
                </div>
                <div className="text-xs truncate">{artistNames}</div>
              </div>
            </div>

            {/* Transport + seek */}
            <div className="grow flex items-center gap-3 max-w-3xl mx-auto">
              <div className="flex items-center gap-0.5 flex-none">
                <TransportButton
                  title="Previous track"
                  onClick={previousTrack}
                  disabled={isDisabled || !hasPreviousTrack}
                >
                  <PreviousIcon size={16} />
                </TransportButton>
                <TransportButton
                  title={isPlaying ? 'Pause' : 'Play'}
                  onClick={togglePlay}
                  disabled={isDisabled}
                >
                  {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                </TransportButton>
                <TransportButton
                  title="Next track"
                  onClick={nextTrack}
                  disabled={isDisabled || !hasNextTrack}
                >
                  <NextIcon size={16} />
                </TransportButton>
              </div>

              <TimeDisplay>{formatTime(currentTime)}</TimeDisplay>
              <div className="grow">{seekBar}</div>
              <TimeDisplay>
                {formatTime(currentTrack.duration_ms || 0)}
              </TimeDisplay>
            </div>

            {/* Playlist */}
            <div className="flex items-center justify-end gap-1 flex-none relative">
              <VolumeIcon size={16} />
              <HapticButton
                onClick={() => setShowPlaylist(!showPlaylist)}
                disabled={playlist.length === 0}
                title="Show playlist"
                className={twMerge(
                  'w98-btn w98-btn-sm gap-1.5',
                  showPlaylist && 'w98-btn-checked',
                )}
              >
                <MusicIcon />
                Playlist ({playlist.length})
              </HapticButton>

              {playlistPanel('absolute bottom-full right-0 mb-1 w-96')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
