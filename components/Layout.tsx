"use client";

import { useAuth } from "@/lib/AuthContext";
import { Avatar } from "./Avatar";
import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";

import logo from "../app/images/logo.png";
import MusicPlayer from "./MusicPlayer";
import { useEffect, useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [hasSpotifyAccess, setHasSpotifyAccess] = useState(false);

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

  const userHeader = (() => {
    if (!user) {
      return null;
    }
    return (
      <div className="flex items-center justify-between bg-purple-600 text-white p-3">
        <div className="flex items-center gap-4">
          <Image
            src={logo.src}
            alt="Logo"
            height={logo.height}
            width={logo.width}
            className="h-10 w-auto"
          />
          <Link href="/">
            <Avatar user={user} size={12} />
          </Link>

          <div>
            <h1 className="text-xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-300 text-sm">@{user.userName}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {userHeader}
      <div className="p-4">{children}</div>
      {hasSpotifyAccess && <MusicPlayer />}
    </div>
  );
}
