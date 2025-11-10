"use client";

import { useAuth } from "@/lib/AuthContext";
import { Avatar } from "./Avatar";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  const userHeader = (() => {
    if (!user) {
      return null;
    }
    return (
      <div className="flex items-center justify-between bg-purple-600 text-white p-3">
        <div className="flex items-center gap-4">
          <Avatar user={user} size={12} />

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
    </div>
  );
}
