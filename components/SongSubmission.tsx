'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import AlbumArt from './AlbumArt';
import { PopulatedRound, PopulatedSubmission } from '@/lib/types';
import { getTrackUrlFromId } from '@/lib/spotify';
import { useAuth } from '@/lib/AuthContext';
import { MultiLine } from './MultiLine';
import Card from './Card';
import { twMerge } from 'tailwind-merge';
import { useData } from '@/lib/DataContext';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';
import { useToast } from '@/lib/ToastContext';
import { HapticButton } from './HapticButton';
import { SpotifySongSearch } from './SpotifySongSearch';
import { OnDeckSubmissionsList } from './OnDeckSubmissions';
import { TrackInfo } from '@/databaseTypes';
import { assertNever } from '@/lib/utils/never';
import { getYouTubeIdFromUrl, YouTubePlayer } from './YouTubePlayer';
import { logError } from '@/lib/errorLogger';

interface SongSubmissionProps {
  round: PopulatedRound;
  isRoundPage: boolean;
  className?: string;
}
export function SongSubmission({
  round,
  isRoundPage,
  className,
}: SongSubmissionProps) {
  const { user } = useAuth();
  const toast = useToast();
  const { refreshData } = useData();
  const [submission, _setSubmission] = useState(round.userSubmission ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackUrl, setTrackUrl] = useState(
    submission ? getTrackUrlFromId(submission.trackInfo.trackId) : '',
  );
  const [error, _setError] = useState<string | null>(null);
  const setError: typeof _setError = useCallback((value) => {
    _setError(value);
    if (!value) {
      return;
    }
    setTimeout(() => {
      if (errorRef.current) {
        errorRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 200);
  }, []);

  const errorRef = useRef<HTMLElement | null>(null);
  const [warningInfo, setWarningInfo] = useState<
    | { code: 'ARTIST_MATCH'; artist: string }
    | { code: 'TITLE_AND_ARTIST_MATCH'; trackInfo: TrackInfo }
    | {
        code: 'PREVIOUSLY_SUBMITTED';
        trackInfo: TrackInfo;
        variant: 'SONG' | 'ARTIST';
      }
    | null
  >(null);
  const [isEditing, setIsEditing] = useState(false);
  const [onDeckSubmissions, setOnDeckSubmissions] = useState<
    Array<{
      trackInfo: TrackInfo;
      isAddedToSidePlaylist: boolean;
    }>
  >(round.onDeckSubmissions);

  useEffect(() => {
    setOnDeckSubmissions(round.onDeckSubmissions);
  }, [round.onDeckSubmissions]);

  const isRealSubmission = submission ? submission._id !== '' : false;

  const setSubmission = useCallback(
    (update: Partial<PopulatedSubmission>) => {
      _setSubmission((prev) => {
        if (prev) {
          return { ...prev, ...update };
        }
        return {
          _id: '',
          roundId: round._id,
          userId: user?._id || '',
          submissionDate: Date.now(),
          note: '',
          userObject: user || undefined,
          guesses: null,
          youtubeURL: '',
          trackInfo: {
            trackId: '',
            title: '',
            artists: [],
            albumName: '',
            albumImageUrl: '',
          },
          ...update,
        };
      });
    },
    [round._id, user],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) {
      setError('Please select a track to submit.');
      logError(new Error('No submission data on submit'));
      toast.show({
        title: `Failed to ${isRealSubmission ? 'update' : 'submit'} song`,
        variant: 'error',
        message: 'No submission data available.',
      });
      return;
    }
    setError(null);
    setWarningInfo(null);
    setIsSubmitting(true);

    try {
      const method = isRealSubmission ? 'PUT' : 'POST';
      const response = await fetch(`/api/rounds/${round._id}/submissions`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackInfo: submission.trackInfo,
          note: submission.note,
          youtubeURL: submission.youtubeURL ?? null,
          force: warningInfo !== null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            `Failed to ${isRealSubmission ? 'update' : 'submit'} song`,
        );
        setIsSubmitting(false);
        return;
      }

      if (data.success === false) {
        if (data.code === 'TITLE_AND_ARTIST_MATCH') {
          setWarningInfo({
            code: 'TITLE_AND_ARTIST_MATCH',
            trackInfo: data.trackInfo,
          });
          setIsSubmitting(false);
          return;
        }
        if (data.code === 'ARTIST_MATCH') {
          setWarningInfo({ code: 'ARTIST_MATCH', artist: data.artist });
          setIsSubmitting(false);
          return;
        }
        if (data.code === 'PREVIOUSLY_SUBMITTED') {
          setWarningInfo({
            code: 'PREVIOUSLY_SUBMITTED',
            trackInfo: data.trackInfo,
            variant: data.variant,
          });
          setIsSubmitting(false);
          return;
        }
      }

      setIsEditing(false);
      setIsSubmitting(false);
    } catch (err) {
      logError(err);
      const message = unknownToErrorString(
        err,
        `Failed to ${isRealSubmission ? 'update' : 'submit'} song`,
      );
      toast.show({
        title: `Failed to ${isRealSubmission ? 'update' : 'submit'} song`,
        variant: 'error',
        message,
      });
      setError(message);
      setIsSubmitting(false);
    } finally {
      refreshData('manual');
    }
  };

  const isRoundEnded = round.votingEndDate <= Date.now();

  const fullClassName = twMerge('p-4', className);

  if (submission && isRealSubmission && !isEditing) {
    return (
      <Card variant="outlined" className={twMerge(fullClassName, 'grid gap-3')}>
        {/* One media row: art, track, then the action pinned right and centred,
            so the content spans the full width instead of bunching left. */}
        <div className="flex items-center gap-3 md:gap-4">
          {submission.trackInfo.albumImageUrl && (
            <AlbumArt
              trackInfo={submission.trackInfo}
              size={64}
              round={round}
            />
          )}
          <div className="flex-1 min-w-0">
            <h5 className="text-sm font-bold">Your Submission</h5>
            <p className="font-semibold text-sm truncate">
              {submission.trackInfo.title}
            </p>
            <p className="text-xs text-ink-muted truncate">
              {submission.trackInfo.artists.join(', ')}
            </p>
            {submission.note && (
              <p className="text-xs text-ink-subtle mt-1 italic">
                <MultiLine>{submission.note}</MultiLine>
              </p>
            )}
          </div>
          {!isRoundEnded && (
            <HapticButton
              onClick={() => setIsEditing(true)}
              className="w98-btn w98-btn-sm shrink-0 self-center"
            >
              Change
            </HapticButton>
          )}
        </div>

        <YouTubePlayer
          youtubeId={getYouTubeIdFromUrl(submission.youtubeURL || '')}
        />
        {isRoundEnded && (
          <p className="text-xs text-ink-subtle mt-3 italic">
            Round has ended - submissions are locked
          </p>
        )}

        {onDeckSubmissions.length > 0 && (
          <OnDeckSubmissionsList
            className="bg-transparent"
            round={round}
            isRoundPage={isRoundPage}
            onDeckSubmissions={onDeckSubmissions}
            onUpdate={setOnDeckSubmissions}
            onRowClick={(submission) => {
              setSubmission({ trackInfo: submission.trackInfo });
              setTrackUrl(
                getTrackUrlFromId(submission.trackInfo.trackId) || '',
              );
            }}
          />
        )}
      </Card>
    );
  }

  if (isRoundEnded && !isRealSubmission) {
    return (
      <Card variant="outlined" className={fullClassName}>
        <p className="text-sm text-ink-subtle italic">
          Round has ended - submissions are no longer accepted
        </p>
      </Card>
    );
  }

  const warningMarkup = (() => {
    if (!warningInfo) {
      return null;
    }

    const warningCode = warningInfo.code;
    switch (warningCode) {
      case 'ARTIST_MATCH': {
        return (
          <Card
            className={
              'bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded text-sm mb-3'
            }
          >
            It looks like there was another submission with this artist already.
            You can still submit by clicking the button again.
          </Card>
        );
      }
      case 'TITLE_AND_ARTIST_MATCH': {
        return (
          <Card
            className={
              'bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded text-sm mb-3'
            }
          >
            It looks like there was another submission that was very similar to
            yours. The song{' '}
            <span className="font-semibold">{`${
              warningInfo.trackInfo.title
            } by ${warningInfo.trackInfo.artists.join(', ')}`}</span>{' '}
            has already been submitted. You can still submit by clicking the
            button again.
          </Card>
        );
      }
      case 'PREVIOUSLY_SUBMITTED': {
        switch (warningInfo.variant) {
          case 'ARTIST': {
            return (
              <Card
                className={
                  'bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded text-sm mb-3'
                }
              >
                <span className="font-semibold">{`Songs from ${warningInfo.trackInfo.artists.join(', ')}`}</span>{' '}
                have already been submitted in one of your leagues. You can
                still submit by clicking the button again.
              </Card>
            );
          }
          case 'SONG': {
            return (
              <Card
                className={
                  'bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded text-sm mb-3'
                }
              >
                <span className="font-semibold">{`${warningInfo.trackInfo.title} by ${warningInfo.trackInfo.artists.join(', ')}`}</span>{' '}
                has already been submitted in one of your leagues. You can still
                submit by clicking the button again.
              </Card>
            );
          }
        }
      }
      default: {
        assertNever(warningCode);
      }
    }
  })();

  const { error: youtubeIdError, youtubeId } = (() => {
    if (!submission || !submission.youtubeURL) {
      return { error: null, youtubeId: null };
    }

    const youtubeId = getYouTubeIdFromUrl(submission.youtubeURL);
    if (!youtubeId) {
      return { error: 'Invalid YouTube URL', youtubeId: null };
    }
    return { error: null, youtubeId };
  })();

  return (
    <Card variant="outlined" className={fullClassName}>
      <h5 className="font-semibold text-sm mb-3 text-ink-muted">
        {isRealSubmission ? 'Update Your Submission' : 'Submit Your Song'}
      </h5>

      {error && (
        <Card
          className={'w98-sunken-thin bg-w98-face px-2 py-1.5 text-sm mb-3'}
        >
          <span ref={errorRef}>{error}</span>
        </Card>
      )}

      {warningMarkup}

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="relative">
          <label>
            <div className="block text-sm mb-1">
              Search for a song or paste Spotify URL *
            </div>

            <SpotifySongSearch
              value={trackUrl}
              onChange={setTrackUrl}
              onTrackFetched={(trackInfo, trackUrl) => {
                setSubmission({ trackInfo });
                setTrackUrl(trackUrl);
                setError(null);
                setWarningInfo(null);
              }}
              onSongSelected={(trackInfo, trackUrl) => {
                setSubmission({ trackInfo });
                setTrackUrl(trackUrl);
                setError(null);
                setWarningInfo(null);
              }}
              currentTrackId={submission?.trackInfo.trackId}
            />
          </label>
        </div>

        {/* Track Preview */}
        {submission?.trackInfo?.trackId && (
          <div className="p-2 w98-sunken bg-w98-face overflow-hidden">
            <div className="flex items-center gap-3">
              {submission.trackInfo.albumImageUrl && (
                <AlbumArt
                  trackInfo={submission.trackInfo}
                  size={56}
                  round={round}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {submission.trackInfo.title}
                </p>
                <p className="text-xs text-ink-muted truncate">
                  {submission.trackInfo.artists.join(', ')}
                </p>
                <p className="text-xs text-ink-subtle truncate">
                  {submission.trackInfo.albumName}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="note" className="block text-sm mb-1">
            Note (optional)
          </label>
          <textarea
            id="note"
            value={submission?.note || ''}
            onChange={(e) => setSubmission({ note: e.target.value })}
            placeholder="Why did you choose this song?"
            rows={2}
            className="block w98-field"
          />
        </div>

        <div className="relative">
          <label>
            <div className="block text-sm mb-1">YouTube URL (optional)</div>

            <input
              type="text"
              autoComplete="off"
              value={submission?.youtubeURL || ''}
              onChange={(e) => {
                setSubmission({ youtubeURL: e.target.value });
              }}
              placeholder="Paste YouTube video URL here"
              className="w98-field"
            />

            {youtubeIdError && (
              <p className="text-xs text-red-600 mt-1">{youtubeIdError}</p>
            )}
          </label>

          <YouTubePlayer youtubeId={youtubeId} className="mt-4" />
        </div>

        <OnDeckSubmissionsList
          round={round}
          isRoundPage={isRoundPage}
          onDeckSubmissions={onDeckSubmissions}
          onUpdate={setOnDeckSubmissions}
          onRowClick={(submission) => {
            setSubmission({ trackInfo: submission.trackInfo });
            setTrackUrl(getTrackUrlFromId(submission.trackInfo.trackId) || '');
          }}
        />

        <div className="flex gap-2">
          <HapticButton
            type="submit"
            disabled={
              isSubmitting || !submission || !submission.trackInfo.trackId
            }
            className="w98-btn w98-btn-default grow"
          >
            {isSubmitting
              ? isRealSubmission
                ? 'Updating...'
                : 'Submitting...'
              : isRealSubmission
                ? 'Update Song'
                : 'Submit Song'}
          </HapticButton>
          {isEditing && (
            <HapticButton
              type="button"
              onClick={() => setIsEditing(false)}
              className="w98-btn"
            >
              Cancel
            </HapticButton>
          )}
        </div>
      </form>
    </Card>
  );
}
