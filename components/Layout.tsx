'use client';

import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import Cookies from 'js-cookie';

import MusicPlayer from './MusicPlayer';
import { useEffect, useState, useMemo } from 'react';
import { APP_NAME } from '@/lib/utils/constants';
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { usePathname, useRouter } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import { isChristmas } from '@/lib/utils/isChristmas';
import { useSpotifyPlayer } from '@/lib/SpotifyPlayerContext';
import { Window } from './win98/Window';
import { Taskbar, type TaskbarWindow } from './win98/Taskbar';
import { Dialog } from './win98/Dialog';
import { W98Button, StatusBar } from './win98/Controls';
import {
  FolderOpenIcon,
  CdIcon,
  ChartIcon,
  SettingsIcon,
  UserIcon,
  MusicIcon,
  DocumentIcon,
} from './win98/Icons';

/** Route → what the window calls itself in the title bar and on the taskbar. */
function useWindowIdentity() {
  const pathname = usePathname() ?? '/';

  return useMemo(() => {
    if (pathname.startsWith('/settings')) {
      return { title: 'Control Panel', icon: <SettingsIcon /> };
    }
    if (pathname.startsWith('/users')) {
      return { title: 'User Profile', icon: <UserIcon /> };
    }
    if (pathname.startsWith('/data')) {
      return { title: 'System Information', icon: <DocumentIcon /> };
    }
    if (pathname.includes('/rounds/')) {
      return { title: 'Round', icon: <CdIcon /> };
    }
    if (pathname.startsWith('/leagues')) {
      return { title: 'League', icon: <ChartIcon /> };
    }
    return { title: 'My Leagues', icon: <FolderOpenIcon /> };
  }, [pathname]);
}

/** Shortcuts on the desktop itself — visible whenever the window is restored. */
function DesktopIcons() {
  const { user } = useAuth();

  const shortcuts = [
    { href: '/', label: 'My Leagues', icon: <FolderOpenIcon size={32} /> },
    {
      href: '/leagues/current',
      label: 'Current League',
      icon: <ChartIcon size={32} />,
    },
    {
      href: '/leagues/current/rounds/current',
      label: 'Current Round',
      icon: <CdIcon size={32} />,
    },
    ...(user
      ? [
          {
            href: `/users/${user._id}`,
            label: 'My Profile',
            icon: <UserIcon size={32} />,
          },
        ]
      : []),
    { href: '/settings', label: 'Settings', icon: <SettingsIcon size={32} /> },
  ];

  return (
    <div className="absolute top-2 left-2 z-0 grid gap-1 w-20">
      {shortcuts.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className="no-underline grid justify-items-center gap-1 p-1 text-white group"
        >
          <span>{s.icon}</span>
          <span className="text-xs text-center leading-tight group-hover:bg-primary group-hover:outline group-hover:outline-dotted group-hover:outline-white px-0.5">
            {s.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [hasSpotifyAccess, setHasSpotifyAccess] = useState(false);
  const [isMusicPlayerExpanded, setIsMusicPlayerExpanded] = useState(false);
  const [isMusicPlayerMinimized, setIsMusicPlayerMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const router = useRouter();
  const identity = useWindowIdentity();
  const { currentTrack } = useSpotifyPlayer();

  // The player only docks once something is loaded, so the space it occupies
  // is reserved on the same condition — otherwise the desktop shows through
  // below the window on pages where nothing is playing.
  const hasPlayer = hasSpotifyAccess && !!currentTrack;
  const isPlayerDocked = hasPlayer && !isMusicPlayerMinimized;

  const { pullDistance, isRefreshing, shouldTriggerRefresh } = usePullToRefresh(
    {
      isMusicPlayerExpanded,
      onRefresh: async () => {
        router.refresh();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
    },
  );

  // Check for Spotify access token
  useEffect(() => {
    const checkSpotifyAccess = () => {
      const token = Cookies.get('spotify_access_token');
      setHasSpotifyAccess(!!token);
    };

    checkSpotifyAccess();
    const interval = setInterval(checkSpotifyAccess, 5000);
    return () => clearInterval(interval);
  }, []);

  const taskbarWindows: TaskbarWindow[] = [
    {
      id: 'main',
      title: `${identity.title} - ${APP_NAME}`,
      icon: identity.icon,
      active: !isMinimized,
      onClick: () => setIsMinimized((m) => !m),
    },
    ...(hasPlayer
      ? [
          {
            id: 'player',
            title: 'Media Player',
            icon: <MusicIcon />,
            active: !isMusicPlayerMinimized,
            // Same contract as the main window's task button: minimize when
            // shown, restore when hidden.
            onClick: () => {
              setIsMusicPlayerMinimized((m) => {
                if (!m) setIsMusicPlayerExpanded(false);
                return !m;
              });
            },
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen w98-desktop relative overflow-x-hidden">
      {isChristmas() && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url('https://media.cnn.com/api/v1/images/stellar/prod/201204114813-mariah-carey-christmas-special.jpg?q=w_3000,h_2000,x_0,y_0,c_fill')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.35,
          }}
        />
      )}

      {user && <DesktopIcons />}

      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        shouldTriggerRefresh={shouldTriggerRefresh}
      />

      {/* The application window. Maximized fills the desktop; restored floats.
          The docked media player eats another ~56px above the taskbar. */}
      <div
        className={twMerge(
          'relative z-10',
          isMaximized
            ? 'p-0 pb-[34px]'
            : 'p-2 md:p-6 pb-[40px] max-w-6xl mx-auto',
          isPlayerDocked && 'pb-[92px]',
        )}
      >
        {!isMinimized && (
          <Window
            title={`${identity.title} - ${APP_NAME}`}
            icon={identity.icon}
            isMaximized={isMaximized}
            onMinimize={() => setIsMinimized(true)}
            onMaximize={() => setIsMaximized((m) => !m)}
            onClose={() => setShowCloseDialog(true)}
            className={
              isMaximized
                ? isPlayerDocked
                  ? 'min-h-[calc(100vh-92px)]'
                  : 'min-h-[calc(100vh-34px)]'
                : ''
            }
            bodyClassName="p-1.5 md:p-3"
            statusBar={
              <StatusBar
                cells={[
                  { content: user ? `Ready` : 'Not connected', grow: true },
                  {
                    content: user ? `${user.firstName} ${user.lastName}` : '—',
                  },
                  { content: hasSpotifyAccess ? 'Spotify OK' : 'Offline' },
                ]}
              />
            }
          >
            {children}
          </Window>
        )}
      </div>

      {hasSpotifyAccess && (
        <MusicPlayer
          isExpanded={isMusicPlayerExpanded}
          setIsExpanded={setIsMusicPlayerExpanded}
          isMinimized={isMusicPlayerMinimized}
          setIsMinimized={setIsMusicPlayerMinimized}
        />
      )}

      <Taskbar windows={taskbarWindows} hasSpotify={hasSpotifyAccess} />

      {showCloseDialog && (
        <Dialog
          title={`Close ${APP_NAME}`}
          kind="question"
          onClose={() => setShowCloseDialog(false)}
          message={
            <p>
              Are you sure you want to log off? Any unsaved votes will be lost.
            </p>
          }
          buttons={
            <>
              <W98Button
                variant="default"
                onClick={() => {
                  setShowCloseDialog(false);
                  logout();
                }}
              >
                Log Off
              </W98Button>
              <W98Button onClick={() => setShowCloseDialog(false)}>
                Cancel
              </W98Button>
            </>
          }
        />
      )}
    </div>
  );
}
