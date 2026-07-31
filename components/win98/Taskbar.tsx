'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/lib/AuthContext';
import { Avatar } from '../Avatar';
import { APP_NAME } from '@/lib/utils/constants';
import {
  WindowsLogo,
  UserIcon,
  SettingsIcon,
  FolderOpenIcon,
  CdIcon,
  ClockIcon,
  VolumeIcon,
  SpotifyIcon,
  KeyIcon,
  ChartIcon,
} from './Icons';
import { Separator } from './Controls';

export interface TaskbarWindow {
  id: string;
  title: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

function StartMenuItem({
  href,
  icon,
  children,
  onNavigate,
  onClick,
}: {
  href?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onNavigate?: () => void;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="flex-none w-6 flex justify-center">{icon}</span>
      <span className="grow text-left">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onNavigate} className="w98-menuitem !py-1.5">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="w98-menuitem !py-1.5">
      {content}
    </button>
  );
}

function StartMenu({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();

  return (
    <div className="w98-menu absolute bottom-full left-0 mb-0.5 w-64 flex animate-menu-in">
      {/* The vertical branding strip, rotated bottom-to-top. */}
      <div className="w-7 flex-none bg-linear-to-b from-primary to-primary-light relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-2 flex justify-center [writing-mode:vertical-rl] rotate-180 text-white font-bold text-sm tracking-wide whitespace-nowrap">
          {APP_NAME}
          <span className="font-normal"> 98</span>
        </div>
      </div>

      <div className="grow min-w-0 py-0.5">
        {user && (
          <>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar user={user} size={8} includeLink={false} />
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-w98-shadow truncate">
                  @{user.userName}
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        <StartMenuItem href="/" icon={<FolderOpenIcon />} onNavigate={onClose}>
          My Leagues
        </StartMenuItem>
        <StartMenuItem
          href="/leagues/current"
          icon={<ChartIcon />}
          onNavigate={onClose}
        >
          Current League
        </StartMenuItem>
        <StartMenuItem
          href="/leagues/current/rounds/current"
          icon={<CdIcon />}
          onNavigate={onClose}
        >
          Current Round
        </StartMenuItem>
        <Separator />
        {user && (
          <StartMenuItem
            href={`/users/${user._id}`}
            icon={<UserIcon />}
            onNavigate={onClose}
          >
            My Profile
          </StartMenuItem>
        )}
        <StartMenuItem
          href="/settings"
          icon={<SettingsIcon />}
          onNavigate={onClose}
        >
          Settings
        </StartMenuItem>
        <Separator />
        <StartMenuItem
          icon={<KeyIcon />}
          onClick={() => {
            onClose();
            logout();
          }}
        >
          Log Off {user?.firstName ?? ''}…
        </StartMenuItem>
      </div>
    </div>
  );
}

/** Ticks in 10s buckets so the snapshot stays stable between renders. */
function subscribeToClock(onChange: () => void) {
  const id = setInterval(onChange, 10_000);
  return () => clearInterval(id);
}

function Clock() {
  const bucket = useSyncExternalStore(
    subscribeToClock,
    () => Math.floor(Date.now() / 10_000),
    () => 0, // The server has no clock to show; it fills in after hydration.
  );
  const now = bucket === 0 ? null : new Date(bucket * 10_000);

  const time = now
    ? now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';
  const date = now
    ? now.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <span title={date} className="tabular-nums min-w-[52px] text-center">
      {time}
    </span>
  );
}

export function Taskbar({
  windows,
  hasSpotify,
}: {
  windows: TaskbarWindow[];
  hasSpotify: boolean;
}) {
  const [startOpen, setStartOpen] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOpen) return;
    const onDown = (e: MouseEvent) => {
      if (startRef.current && !startRef.current.contains(e.target as Node)) {
        setStartOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStartOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [startOpen]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-100 bg-w98-face flex items-center gap-1 px-1 py-0.5 h-[30px]"
      style={{ boxShadow: 'inset 0 1px 0 #fff, inset 0 2px 0 #dfdfdf' }}
    >
      <div className="relative flex-none" ref={startRef}>
        {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}
        <button
          type="button"
          onClick={() => setStartOpen((o) => !o)}
          className={twMerge(
            'w98-btn w98-btn-sm !min-w-0 font-bold h-[24px] gap-1 px-1.5',
            startOpen && 'w98-btn-checked',
          )}
          style={startOpen ? { padding: '3px 5px 1px 7px' } : undefined}
        >
          <WindowsLogo size={16} />
          Start
        </button>
      </div>

      <div className="w98-separator-v !h-5 !self-center" />

      {/* Task buttons — one per open window, exactly as the shell did it. */}
      <div className="flex items-center gap-1 grow min-w-0 overflow-hidden">
        {windows.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={w.onClick}
            title={w.title}
            className={twMerge(
              'w98-btn w98-btn-sm !min-w-0 h-[24px] max-w-40 grow-0 md:grow shrink justify-start gap-1.5 px-1.5 truncate',
              w.active && 'w98-btn-checked font-bold',
            )}
          >
            <span className="flex-none">{w.icon}</span>
            <span className="truncate">{w.title}</span>
          </button>
        ))}
      </div>

      {/* System tray */}
      <div className="flex-none flex items-center gap-1.5 px-1.5 py-0.5 text-sm w98-sunken-thin">
        {hasSpotify && <SpotifyIcon size={14} />}
        <VolumeIcon size={14} />
        <ClockIcon size={14} className="hidden sm:block" />
        <Clock />
      </div>
    </div>
  );
}
