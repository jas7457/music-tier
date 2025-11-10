"use client";

import { useState, useRef, useEffect } from "react";
import { PopulatedUser } from "@/lib/types";
import { Avatar } from "./Avatar";
import clsx from "clsx";

type UserGuessProps = {
  isEditable?: boolean;
  users: PopulatedUser[];
  selectedUser: PopulatedUser | undefined;
  onSelectUser: (user: PopulatedUser | undefined) => void;
  disabled?: boolean;
};

export function UserGuess({
  isEditable = true,
  users,
  selectedUser,
  onSelectUser,
  disabled = false,
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
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelectUser = (user: PopulatedUser | undefined) => {
    onSelectUser(user);
    setIsOpen(false);
  };

  const innerMarkup = (() => {
    const titleText = (() => {
      if (selectedUser) {
        return `Your guess: ${selectedUser.firstName} ${selectedUser.lastName}`;
      }
      if (isEditable) {
        return "Guess who submitted this";
      }
      return "No guess made";
    })();

    return (
      <div
        className={clsx(
          "w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center transition-colors border-gray-300 overflow-hidden",
          {
            "bg-gray-200": !selectedUser,
          }
        )}
        title={titleText}
      >
        {selectedUser ? (
          <Avatar user={selectedUser} />
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-400"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </div>
    );
  })();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      {isEditable ? (
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="disabled:opacity-50 disabled:cursor-not-allowed group group-hover:bg-red-700"
          title={
            selectedUser
              ? `Your guess: ${selectedUser.firstName} ${selectedUser.lastName}`
              : "Guess who submitted this"
          }
        >
          {innerMarkup}
        </button>
      ) : (
        <div>{innerMarkup}</div>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute right-0 mt-2 w-52 pt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          <div className="text-xs italic px-4">Who submitted this song?</div>
          {/* Clear selection option */}
          {selectedUser && (
            <>
              <button
                onClick={() => handleSelectUser(undefined)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors text-sm text-gray-600 border-b border-gray-200"
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
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 ${
                selectedUser?._id === user._id ? "bg-blue-50" : ""
              }`}
            >
              <Avatar user={user} size={6} />
              <span className="text-sm">{user.userName}</span>
              {selectedUser?._id === user._id && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="ml-auto text-blue-600"
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
