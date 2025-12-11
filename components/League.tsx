"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PopulatedLeague, PopulatedUser } from "@/lib/types";
import { CreateRound } from "./CreateRound";
import { MaybeLink } from "./MaybeLink";
import { Avatar } from "./Avatar";
import { MultiLine } from "./MultiLine";
import { Pill } from "./Pill";
import { LeagueRounds } from "./LeagueRounds";
import { LeagueStandings } from "./LeagueStandings";
import { ToggleButton } from "./ToggleButton";
import { getAllRounds } from "@/lib/utils/getAllRounds";
import { DateTime } from "./DateTime";
import { ConfirmUploadButton } from "./UploadThing";
import { useToast } from "@/lib/ToastContext";
import { HapticButton } from "./HapticButton";
import { PlaylistPartyPlayback } from "./playback2/PlaylistPartyPlayback";
import { useSpotifyPlayer } from "@/lib/SpotifyPlayerContext";

export function League({
  league,
  user,
}: {
  league: PopulatedLeague;
  user: PopulatedUser;
}) {
  const toast = useToast();
  const { playTrack } = useSpotifyPlayer();
  const [showStandings, setShowStandings] = useState(
    league.status === "completed"
  );
  const [leagueImageUrl, setLeagueImageUrl] = useState(league.heroImageUrl);
  const [heroStage, setHeroState] = useState(
    leagueImageUrl ? ("edit" as const) : ("add" as const)
  );
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [imageTranslate, setImageTranslate] = useState({ x: 0, y: 0 });
  const touchStartRef = useRef<{
    distance: number;
    scale: number;
    x: number;
    y: number;
  } | null>(null);
  const [playbackOpen, setPlaybackOpen] = useState(false);

  // Reset zoom when closing full-screen
  useEffect(() => {
    if (!isImageFullScreen) {
      setImageScale(1);
      setImageTranslate({ x: 0, y: 0 });
    }
  }, [isImageFullScreen]);

  // Close full-screen image on Escape key
  useEffect(() => {
    if (!isImageFullScreen) {
      return;
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsImageFullScreen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isImageFullScreen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      touchStartRef.current = {
        distance,
        scale: imageScale,
        x: centerX,
        y: centerY,
      };
    } else if (e.touches.length === 1 && imageScale > 1) {
      // Single touch for panning when zoomed
      e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = {
        distance: 0,
        scale: imageScale,
        x: touch.clientX - imageTranslate.x,
        y: touch.clientY - imageTranslate.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale =
        (distance / touchStartRef.current.distance) *
        touchStartRef.current.scale;
      // Limit scale between 1x and 5x
      const newScale = Math.min(Math.max(scale, 1), 5);
      setImageScale(newScale);

      // Reset translation when zooming back to 1x
      if (newScale === 1) {
        setImageTranslate({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && imageScale > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setImageTranslate({
        x: touch.clientX - touchStartRef.current.x,
        y: touch.clientY - touchStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const { userHasCreatedRound, userHasCreatedBonusRound } = useMemo(() => {
    if (!user) {
      return { userHasCreatedRound: false, userHasCreatedBonusRound: false };
    }

    // Check if user has created their round for this league
    const allRounds = getAllRounds(league, {
      includePending: true,
      includeFake: false,
    });

    return allRounds.reduce(
      (acc, round) => {
        if (round.creatorId !== user._id) {
          return acc;
        }
        if (round.isBonusRound) {
          acc.userHasCreatedBonusRound = true;
        } else {
          acc.userHasCreatedRound = true;
        }
        return acc;
      },
      { userHasCreatedRound: false, userHasCreatedBonusRound: false }
    );
  }, [league, user]);

  const finalVoteTimestamp = useMemo(() => {
    const allVotes = league.rounds.completed.flatMap((round) => round.votes);
    return allVotes.reduce(
      (latest, vote) => Math.max(latest, vote.voteDate),
      0
    );
  }, [league]);

  if (!user) {
    return null;
  }

  const text = (() => {
    switch (league.status) {
      case "active":
        return "Active";
      case "completed":
        return "Completed";
      case "upcoming":
        return "Upcoming";
      case "pending":
        return "Pending";
      default:
        return "Unexpected league status. If you see this, tell Jason";
    }
  })();

  const heroButtons = (() => {
    if (league.heroImageUserId !== user._id) {
      return null;
    }
    switch (heroStage) {
      case "add": {
        return (
          <div className="absolute inset-0 flex justify-center items-center">
            <ConfirmUploadButton
              endpoint="imageUploader"
              onCancel={() => {
                setLeagueImageUrl(league.heroImageUrl);
              }}
              onImagePreview={setLeagueImageUrl}
              onUploadComplete={async (url) => {
                try {
                  const response = await fetch(
                    `/api/leagues/${league._id}/hero-image`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ heroImageUrl: url }),
                    }
                  );

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(
                      error.error || "Failed to update hero image"
                    );
                  }

                  setLeagueImageUrl(url);
                  setHeroState("edit");
                  toast.show({
                    variant: "success",
                    message: "Hero image updated successfully!",
                  });
                } catch (error) {
                  console.error("Error updating hero image:", error);
                  toast.show({
                    variant: "error",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Failed to update hero image",
                  });
                  // Revert to original image on error
                  setLeagueImageUrl(league.heroImageUrl);
                }
              }}
              onUploadError={(error) => {
                toast.show({
                  variant: "error",
                  message: `Image upload failed: ${error.message}`,
                });
              }}
            />
          </div>
        );
      }
      case "edit": {
        return (
          <div className="absolute inset-0 flex justify-end items-start p-4">
            <HapticButton
              className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
              onClick={() => setHeroState("add")}
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </HapticButton>
          </div>
        );
      }
    }
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Full-Screen Image Viewer */}
      {isImageFullScreen && leagueImageUrl && (
        <div
          className="fixed inset-0 z-200 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsImageFullScreen(false)}
        >
          <button
            onClick={() => setIsImageFullScreen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors text-white"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <img
            src={leagueImageUrl}
            alt={league.title}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transform: `scale(${imageScale}) translate(${imageTranslate.x}px, ${imageTranslate.y}px)`,
              transition: imageScale === 1 ? "transform 0.3s ease-out" : "none",
              touchAction: "none",
            }}
          />
        </div>
      )}

      {/* Hero Banner with Cover Photo */}
      <div className="relative h-64 md:h-80 overflow-hidden rounded-lg">
        {/* Background Image */}
        {leagueImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${leagueImageUrl})`,
            }}
          />
        )}

        {/* Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent flex justify-center items-center">
          {heroButtons}
        </div>

        {/* Zoom Button - Top Left */}
        {leagueImageUrl && (
          <div className="absolute top-4 left-4">
            <HapticButton
              onClick={() => setIsImageFullScreen(true)}
              className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
              aria-label="View full size"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                />
              </svg>
            </HapticButton>
          </div>
        )}

        {/* Title and Status overlaid on cover */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <MaybeLink
              href={`/leagues/${league._id}`}
              className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg"
            >
              {league.title}
            </MaybeLink>
            <Pill status={league.status}>{text}</Pill>
          </div>
        </div>
      </div>

      {/* League Info Section */}
      <div className="flex flex-col gap-4">
        {/* Avatars and Description */}
        <div className="flex flex-wrap items-center gap-1">
          {league.users.map((user) => (
            <Avatar
              key={user._id}
              user={user}
              includeTooltip
              tooltipText={`${user.userName}'s profile`}
            />
          ))}
        </div>

        <p className="text-gray-600 mb-3">
          <MultiLine>{league.description}</MultiLine>
        </p>

        {/* League Details and Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-300">
          <div className="flex flex-wrap gap-x-2 text-sm text-gray-500">
            {league.status === "completed" && finalVoteTimestamp > 0 && (
              <>
                <DateTime prefix="League ended:">{finalVoteTimestamp}</DateTime>
                <span>•</span>
              </>
            )}
            {league.status === "upcoming" && (
              <>
                <DateTime prefix="League starting:">
                  {league.leagueStartDate}
                </DateTime>
                <span>•</span>
              </>
            )}
            <span>{league.numberOfRounds} rounds</span>
            <span>•</span>
            <span>{league.daysForSubmission} days for submissions</span>
            <span>•</span>
            <span>{league.daysForVoting} days for voting</span>
          </div>

          {/* Toggle between Rounds and Standings */}
          <div className="flex gap-2">
            <ToggleButton
              onClick={() => setShowStandings(false)}
              selected={!showStandings}
            >
              Rounds
            </ToggleButton>
            <ToggleButton
              onClick={() => setShowStandings(true)}
              selected={showStandings}
            >
              Standings
            </ToggleButton>
          </div>
        </div>
      </div>

      {/* Playlist Party Playback Button */}
      {league.playback && (
        <div className="mb-4">
          <HapticButton
            onClick={() => {
              if (league.playback?.topSong) {
                playTrack({
                  trackInfo: league.playback.topSong.trackInfo,
                  round: "same",
                });
              }
              setPlaybackOpen(true);
            }}
            className="w-full px-6 py-4 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 border-2 border-white/40 text-white font-bold text-lg transition-all hover:scale-105 shadow-lg"
          >
            🎵 View Playlist Party Playback
          </HapticButton>
        </div>
      )}

      {/* Create Round */}
      {userHasCreatedRound ? null : (
        <CreateRound leagueId={league._id} isBonusRound={false} />
      )}

      {/* Create Bonus Round */}
      {user.canCreateBonusRound && !userHasCreatedBonusRound && (
        <CreateRound leagueId={league._id} isBonusRound={true} />
      )}

      {/* Content */}
      {showStandings ? (
        <LeagueStandings league={league} />
      ) : (
        <LeagueRounds league={league} />
      )}

      {/* Playlist Party Playback Modal */}
      {playbackOpen && (
        <PlaylistPartyPlayback
          league={league}
          isOpen={playbackOpen}
          onClose={() => setPlaybackOpen(false)}
        />
      )}
    </div>
  );
}
