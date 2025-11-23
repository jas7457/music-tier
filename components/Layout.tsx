"use client";

import { useAuth } from "@/lib/AuthContext";
import { Avatar } from "./Avatar";
import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";

import logo from "../app/images/5.png";
import MusicPlayer from "./MusicPlayer";
import { useEffect, useState, useRef } from "react";
import { MaybeLink } from "./MaybeLink";
import { APP_NAME } from "@/lib/utils/constants";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [hasSpotifyAccess, setHasSpotifyAccess] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check for Spotify access token
  useEffect(() => {
    const checkSpotifyAccess = () => {
      const token = Cookies.get("spotify_access_token");
      setHasSpotifyAccess(!!token);
    };

    checkSpotifyAccess();
    // Check periodically in case token is added/removed
    const interval = setInterval(checkSpotifyAccess, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  const userHeader = (() => {
    if (!user) {
      return null;
    }
    return (
      <div className="grid grid-cols-[auto_1fr_auto] items-center bg-purple-600 text-white p-3">
        <Link href="/" className="flex items-center gap-4">
          <Image
            src={logo.src}
            alt="Logo"
            height={logo.height}
            width={logo.width}
            className="h-10 w-auto cursor-pointer"
          />
        </Link>

        <MaybeLink href="/" className="hover:text-white">
          <h1 className="text-2xl font-bold text-center">{APP_NAME}</h1>
        </MaybeLink>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-full transition-all hover:ring-2 hover:ring-white hover:ring-offset-2 hover:ring-offset-purple-600"
          >
            <Avatar user={user} size={12} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border-2 border-gray-300 z-50 overflow-hidden">
              {/* User Info Section */}
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <h2 className="text-gray-900 font-bold text-base">
                  {user.userName}
                </h2>
                <p className="text-gray-600 text-sm">@{user.userName}</p>
              </div>

              {/* Actions Section */}
              <div className="py-1">
                <Link
                  href={`/users/${user._id}`}
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  View Profile
                </Link>

                <Link
                  href="/leagues/current"
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                  Current League
                </Link>

                <Link
                  href="/leagues/current/rounds/current"
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Current Round
                </Link>

                <button
                  onClick={() => {
                    logout();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-gray-100 pb-28">
      {userHeader}
      <div className="p-2 md:p-4">{children}</div>
      {hasSpotifyAccess && <MusicPlayer />}
    </div>
  );
}
