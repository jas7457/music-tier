import { PopulatedLeague, PopulatedRound } from '@/lib/types';
import { DateTime } from './DateTime';
import { Fragment, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { MultiLine } from './MultiLine';
import { Avatar } from './Avatar';
import { getRoundTitle } from '@/lib/utils/getRoundTitle';
import { MaybeLink } from './MaybeLink';
import { Pill } from './Pill';
import { HapticButton } from './HapticButton';

import spotifyLogo from '../app/images/spotify.svg';
import { useToast } from '@/lib/ToastContext';
import { createSpotifyPlaylist } from '@/lib/utils/createSpotifyPlaylist';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';
import { assertNever } from '@/lib/utils/never';
import { InlineGap } from './InlineGap';

export function RoundInfo({
  round,
  league,
  dateTimeClassName,
  onTitleUpdate,
  onDescriptionUpdate,
}: {
  round: PopulatedRound;
  league: PopulatedLeague;
  dateTimeClassName?: string;
  onTitleUpdate?: (newTitle: string) => void;
  onDescriptionUpdate?: (newDescription: string) => void;
}) {
  const toast = useToast();
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const now = Date.now();
  const stageTitle = (() => {
    switch (round.stage) {
      case 'completed': {
        return 'Completed';
      }
      case 'submission': {
        if (!round._id) {
          return 'Pending';
        }
        return 'Submission';
      }
      case 'voting': {
        return 'Voting';
      }
      case 'currentUserVotingCompleted': {
        return 'Votes Pending';
      }
      case 'upcoming': {
        if (round.isPending) {
          return 'Pending';
        }
        return 'Upcoming';
      }
      case 'unknown': {
        return 'Unknown';
      }
      default: {
        assertNever(round.stage);
      }
    }
  })();

  const spotifyMarkup = (() => {
    const isCorrectStage = (() => {
      switch (round.stage) {
        case 'completed':
        case 'voting':
        case 'currentUserVotingCompleted': {
          return true;
        }
        case 'upcoming':
        case 'submission':
        case 'unknown': {
          return false;
        }
        default: {
          assertNever(round.stage);
        }
      }
    })();
    if (!isCorrectStage) {
      return null;
    }
    if (round.submissions.length < league.users.length) {
      return null;
    }

    if (round.spotifyPlaylistId) {
      return (
        <a
          href={`https://open.spotify.com/playlist/${round.spotifyPlaylistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex gap-1 items-center hover:underline align-text-bottom"
        >
          <img
            alt=""
            src={spotifyLogo.src}
            width={20}
            title="Listen on Spotify"
          />
        </a>
      );
    }

    return (
      <HapticButton
        disabled={creatingPlaylist}
        className="disabled:opacity-30 align-middle"
        title="Create playlist"
        onClick={async () => {
          try {
            setCreatingPlaylist(true);
            await createSpotifyPlaylist({ round });
          } catch (err) {
            const message = unknownToErrorString(
              err,
              'Error creating playlist',
            );
            toast.show({
              title: 'Error creating playlist',
              variant: 'error',
              message,
            });
          } finally {
            setCreatingPlaylist(false);
          }
        }}
      >
        <img
          alt=""
          src={spotifyLogo.src}
          width={20}
          title={
            round.spotifyPlaylistId
              ? 'Listen on Spotify'
              : 'Create Spotify Playlist'
          }
        />
      </HapticButton>
    );
  })();

  const statusPillsMarkup = (() => {
    const pills: Array<{ key: string; pill: React.ReactNode }> = [];

    if (round.isBonusRound) {
      pills.push({
        key: 'bonus',
        pill: <Pill status="info">Bonus Round</Pill>,
      });
    }

    if (round.isKickoffRound) {
      pills.push({
        key: 'kickoff',
        pill: <Pill status="info">Kickoff Round</Pill>,
      });
    }

    pills.push({
      key: 'normal',
      pill: (
        <Pill status={round.isPending ? 'pending' : round.stage}>
          {stageTitle}
        </Pill>
      ),
    });

    const usersThatVoted = new Set(round.votes.map((vote) => vote.userId));
    const usersThatSubmitted = new Set(
      round.submissions.map((submission) => submission.userId),
    );
    const usersThatDidNotVote = league.users
      .filter((user) => !usersThatVoted.has(user._id))
      .map((user) => user._id);
    const usersThatDidNotSubmit = league.users
      .filter((user) => !usersThatSubmitted.has(user._id))
      .map((user) => user._id);

    const didAllUsersSubmit = (() => {
      if (usersThatSubmitted.size >= league.users.length) {
        return true;
      }
      const hasOnlyUsersThatMissedBoth = usersThatDidNotSubmit.every((user) =>
        usersThatDidNotVote.includes(user),
      );
      return hasOnlyUsersThatMissedBoth;
    })();

    if (now > round.submissionEndDate && !didAllUsersSubmit) {
      pills.push({
        key: 'submissions',
        pill: <Pill status="error">Not all users submitted</Pill>,
      });
    }

    if (
      now > round.votingEndDate &&
      usersThatVoted.size < league.users.length
    ) {
      pills.push({
        key: 'votes',
        pill: <Pill status="error">Not all users voted</Pill>,
      });
    }

    if (pills.length === 0) {
      return null;
    }

    return (
      <div className="inline-flex gap-1">
        {pills.map(({ key, pill }) => (
          <Fragment key={key}>{pill}</Fragment>
        ))}
      </div>
    );
  })();

  const descriptionMarkup = (() => {
    if (onDescriptionUpdate) {
      return (
        <textarea
          value={round.description}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none field-sizing-content"
          maxLength={500}
          onChange={(e) => onDescriptionUpdate(e.target.value)}
        />
      );
    }

    const roundDescription = round.isHidden
      ? `${round.creatorObject.userName} has submitted their round, but masking until the previous rounds have completed.`
      : round.description;

    return (
      <p className="text-gray-600 text-sm">
        <MultiLine>{roundDescription}</MultiLine>
      </p>
    );
  })();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        <div className="grow shrink">
          <InlineGap>
            {onTitleUpdate ? (
              <input
                value={round.title}
                className="font-semibold text-lg w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                onChange={(e) => onTitleUpdate(e.target.value)}
              />
            ) : (
              <MaybeLink
                href={`/leagues/${league._id}/rounds/${round._id}`}
                className="font-semibold text-lg inline"
                forceNormalText={!round._id}
              >
                {getRoundTitle(round)}
              </MaybeLink>
            )}

            {spotifyMarkup}

            {statusPillsMarkup}
          </InlineGap>
        </div>

        <div className="shrink-0">
          <Avatar
            user={round.creatorObject}
            size={8}
            tooltipText={`Submitted by ${round.creatorObject.userName}`}
            includeTooltip
          />
        </div>
      </div>

      {descriptionMarkup}

      <div
        className={twMerge(
          'flex flex-wrap gap-x-2 text-xs text-gray-500',
          dateTimeClassName,
        )}
      >
        {round.submissionDate !== round.lastUpdatedDate && (
          <>
            <DateTime prefix="Submission updated:">
              {round.lastUpdatedDate}
            </DateTime>
            <span>•</span>
          </>
        )}
        <DateTime
          prefix={`Submissions ${
            now > round.submissionStartDate ? 'started' : 'start'
          }:`}
        >
          {round.submissionStartDate}
        </DateTime>
        <span>•</span>
        <DateTime
          prefix={`Submissions ${
            now > round.submissionEndDate ? 'ended' : 'end'
          }:`}
        >
          {round.submissionEndDate}
        </DateTime>
        <span>•</span>
        <DateTime
          prefix={`Round ${now > round.votingEndDate ? 'ended' : 'ends'}:`}
        >
          {round.votingEndDate}
        </DateTime>
      </div>
    </div>
  );
}
