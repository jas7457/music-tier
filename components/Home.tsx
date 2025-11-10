"use client";

import { useAuth } from "@/lib/AuthContext";
import {
  useEffect,
  useState,
  useRef,
  createContext,
  useContext,
  useCallback,
} from "react";
import { SongSubmissionRef } from "./SongSubmission";
import Card from "./Card";
import MusicPlayer from "./MusicPlayer";
import Cookies from "js-cookie";
import { formatDate } from "@/lib/utils/formatDate";
import { Round } from "./Round";
import { PopulatedLeague } from "@/lib/types";

interface SubmissionContextType {
  setCurrentTrackAsSubmission: (_trackUrl: string) => void;
}

const SubmissionContext = createContext<SubmissionContextType | null>(null);

export const useSubmission = () => {
  const context = useContext(SubmissionContext);
  if (!context) {
    throw new Error("useSubmission must be used within SubmissionProvider");
  }
  return context;
};

export default function Home() {
  const { user, logout } = useAuth();
  const [leagues, setLeagues] = useState<PopulatedLeague[] | undefined>(
    undefined
  );
  const [hasSpotifyAccess, setHasSpotifyAccess] = useState(false);
  const submissionRefs = useRef<Map<string, SongSubmissionRef>>(new Map());

  const setCurrentTrackAsSubmission = (trackUrl: string) => {
    if (!leagues) {
      return;
    }
    // Find the first current round and open its submission form
    for (const league of leagues) {
      if (league.rounds?.current) {
        const ref = submissionRefs.current.get(league.rounds.current._id);
        if (ref) {
          ref.openSubmissionWithTrack(trackUrl);
          // Scroll to the submission form
          setTimeout(() => {
            const element = document.getElementById(
              `submission-${league.rounds!.current!._id}`
            );
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 100);
          break;
        }
      }
    }
  };

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
                        key={round._id}
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
                        key={round._id}
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
    <SubmissionContext.Provider value={{ setCurrentTrackAsSubmission }}>
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

          {leagueMarkup}
        </div>

        {/* Music Player - shown when user has Spotify access */}
        {hasSpotifyAccess && <MusicPlayer />}
      </div>
    </SubmissionContext.Provider>
  );
}
