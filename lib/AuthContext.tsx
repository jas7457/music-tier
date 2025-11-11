"use client";

import React, { createContext, useContext, useMemo } from "react";
import { PopulatedUser } from "./types";

interface AuthContextType {
  user: PopulatedUser | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: PopulatedUser | null;
}) {
  const providerData = useMemo(() => {
    return {
      user: initialUser,
      logout: async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/";
        } catch (error) {
          console.error("Error logging out:", error);
        }
      },
    };
  }, [initialUser]);

  return (
    <AuthContext.Provider value={providerData}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
