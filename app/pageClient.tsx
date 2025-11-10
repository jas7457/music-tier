"use client";

import { useAuth } from "@/lib/AuthContext";
import Landing from "@/components/Landing";
import Home from "@/components/Home";

export default function Page() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <Home />;
}
