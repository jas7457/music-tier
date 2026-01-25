import { PopulatedOnDeckSubmission, PopulatedRound } from '@/lib/types';
import { HapticButton } from './HapticButton';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';
import { useCallback, useMemo, useState } from 'react';
import { useToast } from '@/lib/ToastContext';
import { SpotifySongSearch } from './SpotifySongSearch';
import AlbumArt from './AlbumArt';
import { twMerge } from 'tailwind-merge';
import { Pill } from './Pill';
import { useAuth } from '@/lib/AuthContext';

type SubmissionPartial = Pick<
  PopulatedOnDeckSubmission,
  'trackInfo' | 'isAddedToSidePlaylist'
>;

export function OnDeckSubmissionsList({
  onDeckSubmissions,
  round,
  isRoundPage,
  onUpdate,
  onRowClick,
  className,
}: {
  onDeckSubmissions: SubmissionPartial[];
  round: PopulatedRound;
  isRoundPage: boolean;
  onRowClick?: (submission: SubmissionPartial, index: number) => void;
  onUpdate: (newOnDecks: SubmissionPartial[]) => void;
  className?: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [onDeckSearchInput, setOnDeckSearchInput] = useState('');
  const toast = useToast();
  const { user } = useAuth();

  const yourSubmission = useMemo(() => {
    return round.submissions.find(
      (submission) => submission.userId === user?._id,
    );
  }, [round.submissions, user?._id]);

  const saveOnDeckToDatabase = useCallback(
    async (newOnDecks: typeof onDeckSubmissions) => {
      setIsSaving(true);
      try {
        const response = await fetch(
          `/api/rounds/${round._id}/onDeckSubmissions`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'update',
              payload: {
                onDeckSubmissions: newOnDecks,
              },
            }),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to save on deck submissions');
        }
      } catch (err) {
        const message = unknownToErrorString(
          err,
          'Error saving on deck submissions',
        );
        toast.show({
          title: 'Error saving on deck submissions',
          variant: 'error',
          message,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [round._id, toast],
  );

  const onDeckInfo = getOnDeckInfo({
    round,
    isRoundPage,
    isGeneralRoundSlot: false,
  });
  if (!onDeckInfo.isVisible) {
    return null;
  }

  const allSaved =
    onDeckSubmissions.length > 0 &&
    onDeckSubmissions.every((submission) => {
      if (submission.isAddedToSidePlaylist) {
        return true;
      }

      const isYourSubmission =
        yourSubmission?.trackInfo.trackId === submission.trackInfo.trackId;
      if (isYourSubmission) {
        return true;
      }

      return false;
    });

  return (
    <div className="grid gap-2">
      <div>
        <div className="block text-xs font-medium text-gray-700">
          On deck songs
        </div>
        <div className="text-xs text-gray-400">
          Add songs you may want to submit later, but aren&apos;t totally sold
          yet. You can then add these to the Side Playlist when the submissions
          end.
        </div>
      </div>

      {onDeckSubmissions.map((submission, index) => {
        const isYourSubmission =
          yourSubmission?.trackInfo.trackId === submission.trackInfo.trackId;

        const pillMarkup = (() => {
          const pills: string[] = [];
          if (isYourSubmission) {
            pills.push('Your submission');
          }
          if (submission.isAddedToSidePlaylist) {
            pills.push('Added to SP');
          }
          if (pills.length === 0) {
            return null;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {pills.map((pillText) => (
                <Pill key={pillText} status="info">
                  {pillText}
                </Pill>
              ))}
            </div>
          );
        })();

        const Component = onRowClick ? 'button' : 'div';
        return (
          <div
            key={index}
            className={twMerge(
              'grid grid-cols-[1fr_auto] items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md',
              className,
            )}
          >
            <div
              className="grid grid-cols-[auto_1fr] items-center gap-3 text-left"
              {...(onRowClick
                ? {
                    onClick: () => {
                      onRowClick(submission, index);
                    },
                    type: 'button',
                  }
                : {})}
            >
              <AlbumArt
                round={round}
                trackInfo={submission.trackInfo}
                playlist={round.onDeckSubmissions.map((s) => s.trackInfo)}
              />
              <Component
                className="flex-1 min-w-0 text-left"
                {...(onRowClick
                  ? {
                      onClick: () => {
                        onRowClick(submission, index);
                      },
                      type: 'button',
                    }
                  : {})}
              >
                <p className="font-semibold text-xs truncate">
                  {submission.trackInfo.title}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {submission.trackInfo.artists.join(', ')}
                </p>

                {pillMarkup}

                {onDeckInfo.canSubmit &&
                  !submission.isAddedToSidePlaylist &&
                  !isYourSubmission && (
                    <div className="flex">
                      <HapticButton
                        className="duration-150 ease-out active:scale-95 p-1 text-white bg-primary hover:bg-primary-dark rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                        disabled={isSaving}
                        onClick={async () => {
                          setIsSaving(true);
                          try {
                            const response = await fetch(
                              `/api/rounds/${round._id}/onDeckSubmissions`,
                              {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  action: 'saveToSidePlaylist',
                                  payload: [submission],
                                }),
                              },
                            );

                            if (!response.ok) {
                              throw new Error(
                                'Failed to save to side playlist',
                              );
                            }
                            toast.show({
                              variant: 'success',
                              message: 'Song saved to side playlist',
                            });
                            onUpdate(
                              onDeckSubmissions.map(
                                (onDeckSubmission, onDeckSubmissionIndex) => {
                                  if (onDeckSubmissionIndex !== index) {
                                    return onDeckSubmission;
                                  }
                                  return {
                                    ...onDeckSubmission,
                                    isAddedToSidePlaylist: true,
                                  };
                                },
                              ),
                            );
                          } catch (err) {
                            const message = unknownToErrorString(
                              err,
                              'Error saving song to side playlist',
                            );
                            toast.show({
                              title: 'Error saving song to side playlist',
                              variant: 'error',
                              message,
                            });
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                      >
                        <div style={{ fontSize: '8px' }}>Add to SP</div>
                      </HapticButton>
                    </div>
                  )}
              </Component>
            </div>

            <HapticButton
              type="button"
              disabled={isSaving}
              onClick={async (event) => {
                event.stopPropagation();
                const newOnDecks = onDeckSubmissions.filter(
                  (_, i) => i !== index,
                );
                onUpdate(newOnDecks);
                await saveOnDeckToDatabase(newOnDecks);
              }}
              className="text-gray-400 hover:text-red-600 p-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </HapticButton>
          </div>
        );
      })}

      {onDeckInfo.canAdd && (
        <div className="relative">
          <SpotifySongSearch
            placeholder="Search for a song to add to your deck (does not submit song)"
            value={onDeckSearchInput}
            disabled={isSaving}
            onChange={setOnDeckSearchInput}
            onTrackFetched={async (trackInfo) => {
              setOnDeckSearchInput('');
              const newOnDecks = [
                ...onDeckSubmissions,
                { trackInfo, isAddedToSidePlaylist: false },
              ];
              onUpdate(newOnDecks);
              await saveOnDeckToDatabase(newOnDecks);
            }}
            onSongSelected={async (trackInfo) => {
              setOnDeckSearchInput('');
              const newOnDecks = [
                ...onDeckSubmissions,
                { trackInfo, isAddedToSidePlaylist: false },
              ];
              onUpdate(newOnDecks);
              await saveOnDeckToDatabase(newOnDecks);
            }}
            currentTrackId={undefined}
          />
        </div>
      )}

      {onDeckSubmissions.length > 0 && onDeckInfo.canSubmit && (
        <HapticButton
          className="duration-150 ease-out active:scale-95 w-full px-2 md:px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
          disabled={allSaved || isSaving}
          onClick={async () => {
            setIsSaving(true);
            try {
              const response = await fetch(
                `/api/rounds/${round._id}/onDeckSubmissions`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'saveToSidePlaylist',
                  }),
                },
              );

              if (!response.ok) {
                throw new Error('Failed to save to side playlist');
              }
              toast.show({
                variant: 'success',
                message: 'On deck submissions saved to side playlist',
              });
              onUpdate(
                onDeckSubmissions.map((submission) => ({
                  ...submission,
                  isAddedToSidePlaylist:
                    yourSubmission?.trackInfo.trackId !==
                    submission.trackInfo.trackId,
                })),
              );
            } catch (err) {
              const message = unknownToErrorString(
                err,
                'Error saving on deck submissions',
              );
              toast.show({
                title: 'Error saving on deck submissions',
                variant: 'error',
                message,
              });
            } finally {
              setIsSaving(false);
            }
          }}
        >
          Save to Side Playlist
        </HapticButton>
      )}
    </div>
  );
}

export function getOnDeckInfo({
  round,
  isRoundPage,
  isGeneralRoundSlot,
}: {
  round: PopulatedRound;
  isRoundPage: boolean;
  isGeneralRoundSlot: boolean;
}): { isVisible: boolean; canAdd: boolean; canSubmit: boolean } {
  const hiddenResult = {
    isVisible: false,
    canAdd: false,
    canSubmit: false,
  } as const;
  if (!round._id || round.isPending || round.isHidden) {
    return hiddenResult;
  }

  const hasSubmissions = round.onDeckSubmissions.length > 0;

  switch (round.stage) {
    case 'upcoming': {
      return isRoundPage
        ? { isVisible: true, canAdd: true, canSubmit: false }
        : hiddenResult;
    }
    case 'submission': {
      return isGeneralRoundSlot
        ? hiddenResult
        : { isVisible: true, canAdd: true, canSubmit: false };
    }
    case 'voting':
    case 'currentUserVotingCompleted': {
      return hasSubmissions
        ? { isVisible: true, canAdd: false, canSubmit: true }
        : hiddenResult;
    }
    case 'completed': {
      return hasSubmissions
        ? { isVisible: true, canAdd: false, canSubmit: true }
        : hiddenResult;
    }
  }

  return hiddenResult;
}
