'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PopulatedLeague, PopulatedUser } from '@/lib/types';
import { CreateRound } from './CreateRound';
import { MaybeLink } from './MaybeLink';
import { Avatar } from './Avatar';
import { MultiLine } from './MultiLine';
import { Pill } from './Pill';
import { LeagueRounds } from './LeagueRounds';
import { LeagueStandings } from './LeagueStandings';
import { ToggleButton } from './ToggleButton';
import { getAllRounds } from '@/lib/utils/getAllRounds';
import { DateTime } from './DateTime';
import { ConfirmUploadButton } from './UploadThing';
import { useToast } from '@/lib/ToastContext';
import { HapticButton } from './HapticButton';
import { PlaylistPartyPlayback } from './playback/PlaylistPartyPlayback';
import { useSpotifyPlayer } from '@/lib/SpotifyPlayerContext';
import { GroupBox } from './win98/Controls';
import { CdIcon } from './win98/Icons';
import { CloseGlyph, TitleBarButton } from './win98/Window';

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
    league.status === 'completed',
  );
  const [leagueImageUrl, setLeagueImageUrl] = useState(league.heroImageUrl);
  const [focalX, setFocalX] = useState(league.heroImageFocalX ?? 50);
  const [focalY, setFocalY] = useState(league.heroImageFocalY ?? 50);
  const [savingFocal, setSavingFocal] = useState(false);
  const [heroStage, setHeroState] = useState<'add' | 'edit' | 'focal'>(
    leagueImageUrl ? 'edit' : 'add',
  );
  const focalImgRef = useRef<HTMLImageElement | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
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
      if (e.key === 'Escape') {
        setIsImageFullScreen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isImageFullScreen]);

  const recomputeMarker = useCallback(() => {
    const img = focalImgRef.current;
    if (!img || !img.offsetWidth || !img.offsetHeight) {
      setMarkerPosition(null);
      return;
    }
    setMarkerPosition({
      left: img.offsetLeft + (focalX / 100) * img.offsetWidth,
      top: img.offsetTop + (focalY / 100) * img.offsetHeight,
    });
  }, [focalX, focalY]);

  useEffect(() => {
    if (heroStage !== 'focal') {
      setMarkerPosition(null);
      return;
    }
    recomputeMarker();
    const img = focalImgRef.current;
    if (!img || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => recomputeMarker());
    observer.observe(img);
    return () => observer.disconnect();
  }, [heroStage, recomputeMarker]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
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
        touch2.clientY - touch1.clientY,
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

  const {
    userHasCreatedRound,
    userHasCreatedBonusRound,
    userHasCreatedKickoffRound,
    userCanCreateBonusRound,
    userCanCreateKickoffRound,
  } = useMemo(() => {
    if (!user) {
      return {
        userHasCreatedRound: false,
        userCanCreateBonusRound: false,
        userHasCreatedBonusRound: false,
        userCanCreateKickoffRound: false,
        userHasCreatedKickoffRound: false,
      };
    }

    // Check if user has created their round for this league
    const allRounds = getAllRounds(league, {
      includeFake: false,
    });

    return allRounds.reduce(
      (acc, round) => {
        if (round.creatorId !== user._id) {
          return acc;
        }
        if (round.isBonusRound) {
          acc.userHasCreatedBonusRound = true;
        } else if (round.isKickoffRound) {
          acc.userHasCreatedKickoffRound = true;
        } else {
          acc.userHasCreatedRound = true;
        }
        return acc;
      },
      {
        userHasCreatedRound: false,
        userHasCreatedBonusRound: false,
        userHasCreatedKickoffRound: false,
        userCanCreateBonusRound: league.bonusRoundUserIds.includes(user._id),
        userCanCreateKickoffRound: league.kickoffRoundUserIds.includes(
          user._id,
        ),
      },
    );
  }, [league, user]);

  const finalVoteTimestamp = useMemo(() => {
    const allVotes = league.rounds.completed.flatMap((round) => round.votes);
    return allVotes.reduce(
      (latest, vote) => Math.max(latest, vote.voteDate),
      0,
    );
  }, [league]);

  if (!user) {
    return null;
  }

  const text = (() => {
    switch (league.status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'upcoming':
        return 'Upcoming';
      case 'pending':
        return 'Pending';
      default:
        return 'Unexpected league status. If you see this, tell Jason';
    }
  })();

  const handleFocalClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (savingFocal) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const newFocalX = ((e.clientX - rect.left) / rect.width) * 100;
    const newFocalY = ((e.clientY - rect.top) / rect.height) * 100;

    const previousFocalX = focalX;
    const previousFocalY = focalY;
    setFocalX(newFocalX);
    setFocalY(newFocalY);
    setSavingFocal(true);

    try {
      const response = await fetch(`/api/leagues/${league._id}/hero-image`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroImageFocalX: newFocalX,
          heroImageFocalY: newFocalY,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update focal point');
      }
      setHeroState('edit');
      toast.show({
        variant: 'success',
        message: 'Focal point updated!',
      });
    } catch (error) {
      setFocalX(previousFocalX);
      setFocalY(previousFocalY);
      toast.show({
        variant: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update focal point',
      });
    } finally {
      setSavingFocal(false);
    }
  };

  const heroButtons = (() => {
    if (league.heroImageUserId !== user._id) {
      return null;
    }
    switch (heroStage) {
      case 'add': {
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
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ heroImageUrl: url }),
                    },
                  );

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(
                      error.error || 'Failed to update hero image',
                    );
                  }

                  setLeagueImageUrl(url);
                  // New image resets the focal to center on the server.
                  setFocalX(50);
                  setFocalY(50);
                  setHeroState('edit');
                  toast.show({
                    variant: 'success',
                    message: 'Hero image updated successfully!',
                  });
                } catch (error) {
                  console.error('Error updating hero image:', error);
                  toast.show({
                    variant: 'error',
                    message:
                      error instanceof Error
                        ? error.message
                        : 'Failed to update hero image',
                  });
                  // Revert to original image on error
                  setLeagueImageUrl(league.heroImageUrl);
                }
              }}
              onUploadError={(error) => {
                toast.show({
                  variant: 'error',
                  message: `Image upload failed: ${error.message}`,
                });
              }}
            />
          </div>
        );
      }
      case 'edit': {
        return (
          <div className="absolute top-4 right-4 flex gap-2">
            {leagueImageUrl && (
              <HapticButton
                className="w98-btn w98-btn-sm !min-w-0"
                onClick={() => setHeroState('focal')}
                aria-label="Set focal point"
              >
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                  <path
                    strokeLinecap="round"
                    d="M12 3v3M12 18v3M3 12h3M18 12h3"
                  />
                </svg>
              </HapticButton>
            )}
            <HapticButton
              className="w98-btn w98-btn-sm !min-w-0"
              onClick={() => setHeroState('add')}
              aria-label="Change image"
            >
              <svg
                className="w-4 h-4 text-black"
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
      case 'focal': {
        return (
          <HapticButton
            className="absolute top-2 right-2 w98-btn w98-btn-sm"
            onClick={() => setHeroState('edit')}
            disabled={savingFocal}
            aria-label="Cancel focal point"
          >
            {savingFocal ? 'Saving…' : 'Cancel'}
          </HapticButton>
        );
      }
    }
  })();

  return (
    <div className="flex flex-col gap-3">
      {/* Full-Screen Image Viewer — an Imaging window over the desktop */}
      {isImageFullScreen && leagueImageUrl && (
        <div
          className="fixed inset-0 z-200 bg-w98-desktop flex flex-col p-2 pb-9"
          onClick={() => setIsImageFullScreen(false)}
        >
          <div
            className="w98-titlebar flex-none"
            onClick={(e) => e.stopPropagation()}
          >
            <CdIcon />
            <span className="grow truncate">{league.title} - Imaging</span>
            <TitleBarButton
              label="Close"
              onClick={() => setIsImageFullScreen(false)}
            >
              <CloseGlyph />
            </TitleBarButton>
          </div>
          <div className="grow w98-paper flex items-center justify-center overflow-hidden">
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
                transition:
                  imageScale === 1 ? 'transform 0.3s ease-out' : 'none',
                touchAction: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Hero Banner with Cover Photo — hung in a sunken picture frame */}
      <div className="relative h-56 md:h-72 overflow-hidden w98-sunken bg-black">
        {/* Background Image - cover normally, contained + centered in focal-pick mode */}
        {leagueImageUrl &&
          (heroStage === 'focal' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
              <img
                ref={focalImgRef}
                src={leagueImageUrl}
                alt={league.title}
                className="block max-w-full max-h-full cursor-crosshair"
                onClick={handleFocalClick}
                onLoad={recomputeMarker}
              />
              {markerPosition && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: markerPosition.left,
                    top: markerPosition.top,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="relative w-8 h-8 rounded-full border-2 border-white ring-2 ring-black/60 shadow-lg">
                    <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: `url(${leagueImageUrl})`,
                backgroundPosition: `${focalX}% ${focalY}%`,
              }}
            />
          ))}

        {/* Playlist Party Playback Overlay */}
        {heroStage !== 'focal' && league.playback && (
          <div className="absolute inset-0 bg-black/60 flex justify-center items-center z-50">
            <HapticButton
              onClick={() => {
                if (league.playback?.topSong) {
                  playTrack({
                    trackInfo: league.playback.topSong.trackInfo,
                    round: 'same',
                  });
                }
                setPlaybackOpen(true);
              }}
              className="w98-btn px-4 py-2 text-lg font-bold gap-2"
            >
              <CdIcon size={20} />
              Playlist Party Playback
            </HapticButton>
          </div>
        )}

        {/* Gradient Overlay for readability */}
        {heroStage !== 'focal' && (
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
        )}

        {/* Hero buttons (upload / pencil / focal / cancel) */}
        {heroButtons}

        {/* Zoom Button - Top Left */}
        {heroStage !== 'focal' && leagueImageUrl && (
          <div className="absolute top-2 left-2">
            <HapticButton
              onClick={() => setIsImageFullScreen(true)}
              className="w98-btn w98-btn-sm !min-w-0"
              aria-label="View full size"
            >
              <svg
                className="w-4 h-4 text-black"
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

        {/* Focal-pick instruction */}
        {heroStage === 'focal' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w98-tooltip pointer-events-none">
            {savingFocal ? 'Saving…' : 'Tap the image to set the focal point'}
          </div>
        )}

        {/* Title and Status overlaid on cover */}
        {heroStage !== 'focal' && (
          <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <MaybeLink
                href={`/leagues/${league._id}`}
                className="text-2xl md:text-3xl font-bold text-white w98-title-shadow no-underline"
              >
                {league.title}
              </MaybeLink>
              <Pill status={league.status}>{text}</Pill>
            </div>
          </div>
        )}
      </div>

      {/* League Info Section */}
      <div className="flex flex-col gap-4">
        {/* Avatars and Description */}
        <div className="flex flex-wrap items-center gap-1.5">
          {league.users.map((user) => (
            <Avatar
              key={user._id}
              user={user}
              includeTooltip
              tooltipText={`${user.userName}'s profile`}
            />
          ))}
        </div>

        <div className="w98-paper p-2 leading-relaxed">
          <MultiLine>{league.description}</MultiLine>
        </div>

        {/* League properties — read like a Properties dialog */}
        <GroupBox label="League Properties">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
            {[
              { label: 'Rounds', value: league.numberOfRounds },
              { label: 'Members', value: league.users.length },
              { label: 'Days to submit', value: league.daysForSubmission },
              { label: 'Days to vote', value: league.daysForVoting },
            ].map((stat) => (
              <div key={stat.label} className="min-w-0">
                <dt className="text-sm truncate">{stat.label}:</dt>
                <dd className="w98-field tabular-nums font-bold">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </GroupBox>

        {/* Timeline note and Rounds/Standings toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            {league.status === 'completed' && finalVoteTimestamp > 0 && (
              <DateTime prefix="League ended:">{finalVoteTimestamp}</DateTime>
            )}
            {league.status === 'upcoming' && (
              <DateTime prefix="League starting:">
                {league.leagueStartDate}
              </DateTime>
            )}
          </div>

          {/* Toggle between Rounds and Standings */}
          <div className="inline-flex gap-0.5">
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

      {/* Create Kickoff Round */}
      {userCanCreateKickoffRound && !userHasCreatedKickoffRound && (
        <CreateRound
          leagueId={league._id}
          isBonusRound={false}
          isKickoffRound={true}
        />
      )}

      {/* Create Round */}
      {userHasCreatedRound ? null : (
        <CreateRound
          leagueId={league._id}
          isBonusRound={false}
          isKickoffRound={false}
        />
      )}

      {/* Create Bonus Round */}
      {userCanCreateBonusRound && !userHasCreatedBonusRound && (
        <CreateRound
          leagueId={league._id}
          isBonusRound={true}
          isKickoffRound={false}
        />
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
