"use client";

import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState, useCallback } from "react";
import Card from "./Card";
import MusicPlayer from "./MusicPlayer";
import Cookies from "js-cookie";
import { formatDate } from "@/lib/utils/formatDate";
import { Round } from "./Round";
import { PopulatedLeague } from "@/lib/types";

export default function Home() {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<PopulatedLeague[] | undefined>(
    undefined
  );
  const [hasSpotifyAccess, setHasSpotifyAccess] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      // Fetch user's leagues
      const leaguesResponse = await fetch("/api/leagues/user");
      if (!leaguesResponse.ok) {
        throw new Error("Failed to fetch leagues");
      }
      const leaguesData = (await leaguesResponse.json()) as PopulatedLeague[];
      setLeagues(leaguesData);
    } catch (error) {
      console.error("Error fetching leagues and rounds:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  if (!user) {
    return null;
  }

  const leagueMarkup = (() => {
    if (!leagues) {
      return (
        <Card className="p-8 text-center">
          <p className="text-gray-600">Loading leagues...</p>
        </Card>
      );
    }

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
        {leagues.map((league) => {
          const currentRoundMarkup = (() => {
            if (!league.rounds.current) {
              return null;
            }

            return (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-green-700">
                  Current Round
                </h3>
                <Card className="border-green-200 bg-green-50 p-4">
                  <Round
                    currentUser={user}
                    round={league.rounds.current}
                    league={league}
                    onDataSaved={fetchData}
                  />
                </Card>
              </div>
            );
          })();

          return (
            <Card
              key={league._id.toString()}
              variant="elevated"
              className="p-6"
            >
              {/* League Header */}
              <div className="border-b pb-4 mb-6">
                <h2 className="text-2xl font-bold mb-2">{league.title}</h2>
                <p className="text-gray-600 mb-3">{league.description}</p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>{league.numberOfRounds} rounds</span>
                  <span>•</span>
                  <span>{league.daysForSubmission} days for submissions</span>
                  <span>•</span>
                  <span>{league.daysForVoting} days for voting</span>
                </div>
              </div>

              {/* Current Round */}
              {currentRoundMarkup}

              {/* Completed Rounds */}
              {league.rounds.completed.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">
                    Completed Rounds
                  </h3>
                  <div className="space-y-3">
                    {league.rounds.completed.map((round) => (
                      <Card
                        key={round._id.toString()}
                        variant="outlined"
                        className="bg-gray-50 p-4"
                      >
                        <h4 className="font-semibold mb-1">
                          Round {round.roundIndex + 1}: {round.title}
                        </h4>
                        <p className="text-gray-600 text-sm mb-2">
                          {round.description}
                        </p>
                        <div className="text-xs text-gray-500">
                          Ended: {formatDate(round.votingEndDate)}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Rounds */}
              {league.rounds.upcoming.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-700">
                    Upcoming Rounds
                  </h3>
                  <div className="space-y-3">
                    {league.rounds.upcoming.map((round) => (
                      <Card
                        key={round._id.toString()}
                        className="border-blue-200 bg-blue-50 p-4"
                      >
                        <h4 className="font-semibold mb-1">
                          Round {round.roundIndex + 1}: {round.title}
                        </h4>
                        <p className="text-gray-600 text-sm mb-2">
                          {round.description}
                        </p>
                        <div className="text-xs text-gray-500">
                          Submissions start:{" "}
                          {formatDate(round.submissionStartDate)}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* No rounds message */}
              {!league.rounds.current &&
                league.rounds.completed.length === 0 &&
                league.rounds.upcoming.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No rounds yet in this league.
                  </p>
                )}
            </Card>
          );
        })}
      </div>
    );
  })();

  return (
    <>
      <div className="max-w-4xl mx-auto">{leagueMarkup}</div>

      {/* Music Player - shown when user has Spotify access */}
      {hasSpotifyAccess && <MusicPlayer />}
    </>
  );
}
