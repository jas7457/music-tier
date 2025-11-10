"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { PopulatedUser } from "./types";

interface AuthContextType {
  user: PopulatedUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PopulatedUser | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    debugger;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (!user || JSON.stringify(user) !== JSON.stringify(data.user)) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const providerData = useMemo(() => {
    return {
      user,
      loading,
      refreshUser,
      logout: async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
          setUser(null);
        } catch (error) {
          console.error("Error logging out:", error);
        }
      },
    };
  }, [loading, refreshUser, user]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

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
