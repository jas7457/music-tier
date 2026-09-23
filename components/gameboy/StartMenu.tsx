'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { isSoundOn, setSoundOn } from '@/lib/gameboy/sound';

export function StartMenu({
  onClose,
  hasPlayer,
  onOpenPlayer,
}: {
  onClose: () => void;
  hasPlayer: boolean;
  onOpenPlayer: () => void;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sound, setSound] = useState(isSoundOn);

  const itemClass = 'gb-menu-item';

  return (
    <div className="gb-menu-backdrop" data-gb-layer="10">
      <button
        type="button"
        className="absolute inset-0 w-full h-full cursor-default"
        aria-label="Close menu"
        data-gb-skip
        tabIndex={-1}
        onClick={onClose}
      />
      <nav
        className="gb-window gb-menu"
        aria-label="Start menu"
        data-gb-cursor-style="arrow"
      >
        <div className="gb-menu-title">MENU</div>
        <ul>
          <li>
            <Link href="/" className={itemClass} onClick={onClose}>
              HOME
            </Link>
          </li>
          {user && (
            <>
              <li>
                <Link
                  href="/leagues/current"
                  className={itemClass}
                  onClick={onClose}
                >
                  LEAGUE
                </Link>
              </li>
              <li>
                <Link
                  href="/leagues/current/rounds/current"
                  className={itemClass}
                  onClick={onClose}
                >
                  ROUND
                </Link>
              </li>
              <li>
                <Link
                  href={`/users/${user._id}`}
                  className={itemClass}
                  onClick={onClose}
                >
                  PROFILE
                </Link>
              </li>
              <li>
                <Link href="/settings" className={itemClass} onClick={onClose}>
                  OPTIONS
                </Link>
              </li>
            </>
          )}
          {hasPlayer && (
            <li>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  onClose();
                  onOpenPlayer();
                }}
              >
                MUSIC
              </button>
            </li>
          )}
          <li>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                onClose();
                router.refresh();
              }}
            >
              REFRESH
            </button>
          </li>
          <li>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                setSoundOn(!sound);
                setSound(!sound);
              }}
            >
              SOUND {sound ? 'ON' : 'OFF'}
            </button>
          </li>
          {user && (
            <li>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  onClose();
                  logout();
                }}
              >
                LOG OUT
              </button>
            </li>
          )}
          <li>
            <button
              type="button"
              className={itemClass}
              data-gb-back
              onClick={onClose}
            >
              EXIT
            </button>
          </li>
        </ul>
        {user && <div className="gb-menu-footer">{user.userName}</div>}
      </nav>
    </div>
  );
}
