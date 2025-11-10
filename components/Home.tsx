"use client";

import { useAuth } from "@/lib/AuthContext";
import { useCallback } from "react";
import Card from "./Card";
import { PopulatedLeague } from "@/lib/types";
import { useRouter } from "next/navigation";
import { League } from "./League";

export default function Home({ leagues }: { leagues: PopulatedLeague[] }) {
  const { user } = useAuth();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    router.refresh();
  }, [router]);

  if (!user) {
    return null;
  }

  const leagueMarkup = (() => {
    if (leagues.length === 0) {
      return (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Leagues Yet</h2>
          <p className="text-gray-600">
            You&apos;re not part of any leagues yet. Create or join one to get
            started!
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-8">
        {leagues.map((league) => (
          <Card key={league._id.toString()} variant="elevated" className="p-6">
            <League league={league} onDataSaved={fetchData} />
          </Card>
        ))}
      </div>
    );
  })();

  return (
    <>
      <div className="max-w-4xl mx-auto">{leagueMarkup}</div>
    </>
  );
}
