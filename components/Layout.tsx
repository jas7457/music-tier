"use client";

import { useAuth } from "@/lib/AuthContext";
import { Avatar } from "./Avatar";
import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";

import MusicPlayer from "./MusicPlayer";
import { useEffect, useState, useRef } from "react";
import { APP_NAME, logo, logoLarge } from "@/lib/utils/constants";
import { HapticButton } from "./HapticButton";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "./PullToRefreshIndicator";
import { useRouter } from "next/navigation";
import { isChristmas } from "@/lib/utils/isChristmas";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [hasSpotifyAccess, setHasSpotifyAccess] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMusicPlayerExpanded, setIsMusicPlayerExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Pull to refresh functionality
  const { pullDistance, isRefreshing, shouldTriggerRefresh } = usePullToRefresh(
    {
      isMusicPlayerExpanded,
      onRefresh: async () => {
        // window.location.reload();
        router.refresh();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
    }
  );

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
      <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center bg-linear-to-r from-primary-dark via-primary to-primary-dark text-white p-3 shadow-lg border-b-2 border-primary-light/30 backdrop-blur-sm relative z-10">
        <Link href="/" className="flex items-center gap-4">
          <Image
            src={logo.src}
            alt="Logo"
            height={logo.height}
            width={logo.width}
            className="h-10 w-auto cursor-pointer"
          />
        </Link>

        <div className="flex justify-center">
          <Link href="/">
            <img src={logoLarge.src} alt={APP_NAME} className="w-56" />
          </Link>
        </div>

        <div className="relative" ref={dropdownRef}>
          <HapticButton
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-full transition-all hover:ring-2 hover:ring-white hover:ring-offset-2 hover:ring-offset-primary-dark"
          >
            <Avatar user={user} size={12} includeLink={false} />
          </HapticButton>

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
                  href="/settings"
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
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Settings
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
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        shouldTriggerRefresh={shouldTriggerRefresh}
      />
      {userHeader}
      {isChristmas() && (
        <div
          className="fixed top-0 left-0 w-screen h-screen"
          style={{
            backgroundImage: `url('https://media.cnn.com/api/v1/images/stellar/prod/201204114813-mariah-carey-christmas-special.jpg?q=w_3000,h_2000,x_0,y_0,c_fill')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 0,
            opacity: 0.2,
          }}
        ></div>
      )}
      <div className="p-2 md:p-4">{children}</div>
      {hasSpotifyAccess && (
        <MusicPlayer
          isExpanded={isMusicPlayerExpanded}
          setIsExpanded={setIsMusicPlayerExpanded}
        />
      )}
    </div>
  );
}
