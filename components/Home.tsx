"use client";

import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState } from "react";
import { League, Round } from "@/databaseTypes";
import SongSubmission from "./SongSubmission";
import Card from "./Card";
import MusicPlayer from "./MusicPlayer";
import Cookies from "js-cookie";

interface CategorizedRounds {
  current?: Round;
  completed: Round[];
  upcoming: Round[];
}

interface LeagueWithRounds extends League {
  rounds?: CategorizedRounds;
}

export default function Home() {
  const { user, logout } = useAuth();
  const [leagues, setLeagues] = useState<LeagueWithRounds[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSpotifyAccess, setHasSpotifyAccess] = useState(false);

  useEffect(() => {
    const fetchLeaguesAndRounds = async () => {
      try {
        // Fetch user's leagues
        const leaguesResponse = await fetch("/api/leagues/user");
        const leaguesData = await leaguesResponse.json();

        if (leaguesData.leagues) {
          // Fetch rounds for each league
          const leaguesWithRounds = await Promise.all(
            leaguesData.leagues.map(async (league: League) => {
              const roundsResponse = await fetch(
                `/api/leagues/${league._id.toString()}/rounds`
              );
              const roundsData = await roundsResponse.json();
              return {
                ...league,
                rounds: roundsData.rounds,
              };
            })
          );

          setLeagues(leaguesWithRounds);
        }
      } catch (error) {
        console.error("Error fetching leagues and rounds:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchLeaguesAndRounds();
    }
  }, [user]);

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

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Not set";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 pb-32">
      <div className="max-w-4xl mx-auto">
        {/* User Profile Section */}
        <Card variant="elevated" className="p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user.photoUrl && (
                <img
                  src={user.photoUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-600">@{user.userName}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </Card>

        {/* Leagues Section */}
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600">Loading leagues...</p>
          </Card>
        ) : leagues.length === 0 ? (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No Leagues Yet</h2>
            <p className="text-gray-600">
              You're not part of any leagues yet. Create or join one to get
              started!
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {leagues.map((league) => (
              <Card key={league._id} variant="elevated" className="p-6">
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
                {league.rounds?.current && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-green-700">
                      Current Round
                    </h3>
                    <Card className="border-green-200 bg-green-50 p-4">
                      <h4 className="font-semibold text-lg mb-1">
                        {league.rounds.current.title}
                      </h4>
                      <p className="text-gray-600 text-sm mb-2">
                        {league.rounds.current.description}
                      </p>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>
                          Submissions start date:{" "}
                          {formatDate(
                            league.rounds.current.submissionStartDate
                          )}
                        </span>
                        <span>•</span>
                        <span>
                          Submission end date:{" "}
                          {formatDate(
                            league.rounds.current.submissionStartDate! +
                              league.daysForSubmission * 24 * 60 * 60 * 1000
                          )}
                        </span>
                        <span>•</span>
                        <span>
                          Round ends:{" "}
                          {formatDate(
                            league.rounds.current.submissionStartDate! +
                              (league.daysForSubmission +
                                league.daysForVoting) *
                                24 *
                                60 *
                                60 *
                                1000
                          )}
                        </span>
                      </div>

                      {/* Song Submission Section */}
                      <SongSubmission
                        roundId={league.rounds.current._id}
                        roundEndDate={
                          league.rounds.current.voteStartDate
                            ? league.rounds.current.voteStartDate +
                              league.daysForVoting * 24 * 60 * 60 * 1000
                            : null
                        }
                      />
                    </Card>
                  </div>
                )}

                {/* Completed Rounds */}
                {league.rounds?.completed &&
                  league.rounds.completed.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-700">
                        Completed Rounds
                      </h3>
                      <div className="space-y-3">
                        {league.rounds.completed.map((round) => (
                          <Card
                            key={round._id}
                            variant="outlined"
                            className="bg-gray-50 p-4"
                          >
                            <h4 className="font-semibold mb-1">
                              {round.title}
                            </h4>
                            <p className="text-gray-600 text-sm mb-2">
                              {round.description}
                            </p>
                            <div className="text-xs text-gray-500">
                              Ended:{" "}
                              {formatDate(
                                round.voteStartDate
                                  ? round.voteStartDate +
                                      league.daysForVoting * 24 * 60 * 60 * 1000
                                  : undefined
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Upcoming Rounds */}
                {league.rounds?.upcoming &&
                  league.rounds.upcoming.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-blue-700">
                        Upcoming Rounds
                      </h3>
                      <div className="space-y-3">
                        {league.rounds.upcoming.map((round) => (
                          <Card
                            key={round._id}
                            className="border-blue-200 bg-blue-50 p-4"
                          >
                            <h4 className="font-semibold mb-1">
                              {round.title}
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
                {!league.rounds?.current &&
                  (!league.rounds?.completed ||
                    league.rounds.completed.length === 0) &&
                  (!league.rounds?.upcoming ||
                    league.rounds.upcoming.length === 0) && (
                    <p className="text-gray-500 text-center py-4">
                      No rounds yet in this league.
                    </p>
                  )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Music Player - shown when user has Spotify access */}
      {hasSpotifyAccess && <MusicPlayer />}
    </div>
  );
}
