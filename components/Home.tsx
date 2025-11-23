"use client";

import Card from "./Card";
import { PopulatedLeague, PopulatedUser } from "@/lib/types";
import { League } from "./League";
import { useRealTimeUpdates } from "@/lib/PusherContext";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Expandable } from "./Expandable";

export default function Home({
  leagues,
  user,
}: {
  leagues: PopulatedLeague[];
  user: PopulatedUser;
}) {
  const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(
    new Set(leagues.length > 0 ? [leagues[0]._id] : [])
  );

  useRealTimeUpdates(leagues);

  useEffect(() => {
    if (!("Notification" in window)) {
      return;
    }

    if (
      Notification.permission === "denied" ||
      Notification.permission === "granted"
    ) {
      return;
    }

    const requestPermission = () => {
      Notification.requestPermission();
    };

    document.addEventListener("click", requestPermission, { once: true });
    return () => {
      document.removeEventListener("click", requestPermission);
    };
  }, []);

  if (!user) {
    return <div>No user data...</div>;
  }

  const toggleLeague = (leagueId: string) => {
    setExpandedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(leagueId)) {
        next.delete(leagueId);
      } else {
        next.add(leagueId);
      }
      return next;
    });
  };

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
        {/* Current League */}
        {leagues.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Current League
            </h2>
            <Card variant="elevated">
              <div className="p-3 md:p-6">
                <League league={leagues[0]} user={user} />
              </div>
            </Card>
          </div>
        )}

        {/* Previous Leagues */}
        {leagues.length > 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Previous Leagues
            </h2>
            <div className="space-y-4">
              {leagues.slice(1).map((league) => {
                const isExpanded = expandedLeagues.has(league._id);

                return (
                  <Card
                    key={league._id.toString()}
                    variant="elevated"
                    className="overflow-hidden"
                  >
                    <button
                      onClick={() => toggleLeague(league._id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">{league.title}</h3>
                        <span className="text-sm text-gray-500">
                          ({league.users.length} members)
                        </span>
                      </div>
                      <svg
                        className={twMerge(
                          "w-6 h-6 text-gray-400 transition-transform",
                          isExpanded ? "rotate-180" : ""
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    <Expandable className="p-4" isExpanded={isExpanded}>
                      <League league={league} user={user} />
                    </Expandable>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  })();

  return <div className="max-w-4xl mx-auto">{leagueMarkup}</div>;
}
