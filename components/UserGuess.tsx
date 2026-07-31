'use client';

import { useState, useRef, useEffect } from 'react';
import { PopulatedUser } from '@/lib/types';
import { Avatar } from './Avatar';
import { twMerge } from 'tailwind-merge';
import { GuessFeedback } from './GuessFeedback';
import { HapticButton } from './HapticButton';

type UserGuessProps = {
  users: PopulatedUser[];
  selectedUser: PopulatedUser | undefined;
  onSelectUser: (user: PopulatedUser | undefined) => void;
  disabled?: boolean;
  isCorrect: boolean | undefined;
  stage: 'voting' | 'guessing' | 'submitted';
};

export function UserGuess({
  users,
  selectedUser,
  onSelectUser,
  disabled = false,
  isCorrect,
  stage,
}: UserGuessProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelectUser = (user: PopulatedUser | undefined) => {
    onSelectUser(user);
    setIsOpen(false);
  };

  const innerMarkup = (() => {
    return (
      <div>
        {typeof isCorrect === 'boolean' && (
          <GuessFeedback
            className="absolute -top-0.5 -right-0.5 z-10"
            isCorrect={isCorrect}
          />
        )}
        {selectedUser ? (
          <Avatar user={selectedUser} includeLink={false} />
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-ink-subtle"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </div>
    );
  })();

  const titleText = (() => {
    if (selectedUser) {
      return `Your guess: ${selectedUser.userName}`;
    }
    if (stage === 'guessing') {
      return 'Guess who submitted this';
    }
    return 'No guess made';
  })();

  const fullMarkup = (() => {
    if (stage === 'voting') {
      return <div className="w-10 h-10"></div>;
    }
    if (stage === 'guessing') {
      return (
        <HapticButton
          title={titleText}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={twMerge(
            'w98-btn !min-w-0 group relative w-9 h-9 !p-0',
            selectedUser ? '' : 'bg-w98-face',
          )}
        >
          {innerMarkup}
        </HapticButton>
      );
    }
    return (
      <div className="flex items-center justify-center w-10 h-10">
        {innerMarkup}
      </div>
    );
  })();

  return (
    <div className="relative" ref={dropdownRef}>
      {fullMarkup}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="w98-menu absolute right-0 mt-1 w-52 z-10 max-h-64 overflow-y-auto">
          <div className="text-xs px-2 py-1 font-bold">
            Who submitted this song?
          </div>
          {/* Clear selection option */}
          {selectedUser && (
            <>
              <button
                onClick={() => handleSelectUser(undefined)}
                className="w98-menuitem"
              >
                Clear guess
              </button>
            </>
          )}

          {/* User options */}
          {users.map((user) => (
            <button
              key={user._id}
              onClick={() => handleSelectUser(user)}
              className={twMerge(
                'w98-menuitem',
                selectedUser?._id === user._id ? 'w98-selected' : '',
              )}
            >
              <Avatar user={user} size={6} includeLink={false} />
              <span className="text-sm">{user.userName}</span>
              {selectedUser?._id === user._id && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="ml-auto"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
