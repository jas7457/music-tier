'use client';

import { useEffect, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { MultiLine } from '@/components/MultiLine';
import { GracePeriodNotice } from '@/components/GracePeriodNotice';
import { useToast } from '@/lib/ToastContext';
import { useData } from '@/lib/DataContext';
import { openSpotifyPlaylist } from '@/lib/utils/openSpotifyPlaylist';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';
import { MAX_DESCRIPTION_LENGTH } from '@/lib/utils/constants';
import { formatDate } from '@/lib/utils/formatDate';
import type { PopulatedLeague, PopulatedRound } from '@/lib/types';
import spotifyLogo from '@/app/images/spotify.svg';
import { formatCountdown } from '../hud/Countdown';
import './round-sleeve.css';

type Look = { stamp: string; tone: string };

function getLook(round: PopulatedRound): Look {
  if (round.isPending) {
    return { stamp: 'Not written', tone: 'pending' };
  }
  switch (round.stage) {
    case 'upcoming':
      return { stamp: 'Coming up', tone: 'upcoming' };
    case 'submission':
      return { stamp: 'Now open', tone: 'submission' };
    case 'voting':
    case 'currentUserVotingCompleted':
      return { stamp: 'Voting', tone: 'voting' };
    case 'completed':
      return { stamp: 'Results in', tone: 'completed' };
    default:
      return { stamp: '???', tone: 'pending' };
  }
}

/**
 * A round, presented as a record sleeve: the theme in big type, who curated
 * it, a stamp for where it's at, and a timeline to the results. Everything
 * the old round header did (playlist, editing your own upcoming round,
 * hidden themes, grace periods, missing-people warnings) lives here too.
 */
export function RoundSleeve({
  round,
  league,
  openRound,
  editable = false,
}: {
  round: PopulatedRound;
  league: PopulatedLeague;
  openRound?: (roundId: string) => void;
  // you made this upcoming round: you can still change its theme
  editable?: boolean;
}) {
  const look = getLook(round);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const title = round.isHidden
    ? 'Top secret theme'
    : round.title || (round._id ? 'Theme TBA' : 'Not written yet');
  const description = round.isHidden
    ? `${round.creatorObject.userName} has written their round, but it stays sealed until the rounds before it finish.`
    : round.description;

  const previousId = round.previousRound?._id;
  const nextId = round.nextRound?._id;

  return (
    <div className="rs-wrap">
      {openRound && (previousId || nextId) && (
        <div className="rs-nav">
          {round.previousRound && previousId ? (
            <button type="button" className="rs-nav-btn" onClick={() => openRound(previousId)}>
              ← R{round.previousRound.roundIndex + 1}
            </button>
          ) : (
            <span />
          )}
          {round.nextRound && nextId ? (
            <button type="button" className="rs-nav-btn" onClick={() => openRound(nextId)}>
              R{round.nextRound.roundIndex + 1} →
            </button>
          ) : (
            <span />
          )}
        </div>
      )}

      <section className="rs" data-tone={look.tone}>
        <div className="rs-vinyl" aria-hidden data-spinning={look.tone === 'submission' || look.tone === 'voting' || undefined} />
        <div className="rs-sticker" aria-hidden>
          <span>R</span>
          {round.roundIndex + 1}
        </div>
        <div className="rs-stamp">{look.stamp}</div>

        <div className="rs-tags">
          {round.isKickoffRound && <span className="rs-tag">Kickoff</span>}
          {round.isBonusRound && <span className="rs-tag">Bonus</span>}
          {round.gracePeriod && <span className="rs-tag rs-tag-warn">+12h grace</span>}
        </div>

        {editable ? (
          <EditableTheme round={round} league={league} />
        ) : (
          <>
            <h3 className="rs-title" data-sealed={round.isHidden || undefined}>
              {round.isHidden && <span aria-hidden>🔒 </span>}
              {title}
            </h3>
            {description && (
              <div className="rs-note">
                <MultiLine>{description}</MultiLine>
              </div>
            )}
          </>
        )}

        <div className="rs-footer">
          <div className="rs-curator">
            <Avatar user={round.creatorObject} size={7} includeLink={false} />
            <span>
              curated by <strong>{round.creatorObject.userName}</strong>
            </span>
          </div>
          <PlaylistButton round={round} league={league} />
        </div>
      </section>

      {now !== null && <Timeline round={round} now={now} />}
      <Warnings round={round} league={league} now={now} />
      <GracePeriodNotice round={round} />
    </div>
  );
}

/** Submissions → voting → results, with where we are and what's next. */
function Timeline({ round, now }: { round: PopulatedRound; now: number }) {
  const steps = [
    { label: 'Songs in', at: round.submissionStartDate },
    { label: 'Voting', at: round.submissionEndDate },
    { label: 'Results', at: round.votingEndDate },
  ];
  const span = round.votingEndDate - round.submissionStartDate;
  const progress =
    span > 0
      ? Math.min(1, Math.max(0, (now - round.submissionStartDate) / span))
      : 0;
  const next = steps.find((step) => step.at > now);
  return (
    <div className="rs-timeline">
      <div className="rs-track">
        <div className="rs-track-fill" style={{ width: `${progress * 100}%` }} />
        {steps.map((step, i) => {
          const position = span > 0 ? (step.at - round.submissionStartDate) / span : i / 2;
          return (
            <div
              key={step.label}
              className="rs-step"
              data-done={step.at <= now || undefined}
              style={{ left: `${position * 100}%` }}
            >
              <span className="rs-step-dot" />
              <span className="rs-step-label">
                {step.label}
                <small>{formatDate(step.at)}</small>
              </span>
            </div>
          );
        })}
      </div>
      {next && (
        <div className="rs-next">
          {next.label === 'Songs in'
            ? 'Opens'
            : next.label === 'Voting'
              ? 'Voting opens'
              : 'Results'}{' '}
          in <strong>{formatCountdown(next.at - now)}</strong>
        </div>
      )}
    </div>
  );
}

/** The "somebody missed it" flags the old round header showed. */
function Warnings({
  round,
  league,
  now,
}: {
  round: PopulatedRound;
  league: PopulatedLeague;
  now: number | null;
}) {
  if (now === null) {
    return null;
  }
  const voted = new Set(round.votes.map((vote) => vote.userId));
  const submitted = new Set(round.submissions.map((s) => s.userId));
  const missedVote = league.users.filter((u) => !voted.has(u._id)).map((u) => u._id);
  const missedSong = league.users.filter((u) => !submitted.has(u._id)).map((u) => u._id);
  const everyoneSubmitted =
    submitted.size >= league.users.length ||
    missedSong.every((id) => missedVote.includes(id));
  const flags: string[] = [];
  if (now > round.submissionEndDate && !everyoneSubmitted) {
    flags.push('Not everyone submitted');
  }
  if (now > round.votingEndDate && voted.size < league.users.length) {
    flags.push('Not everyone voted');
  }
  if (flags.length === 0) {
    return null;
  }
  return (
    <div className="rs-flags">
      {flags.map((flag) => (
        <span key={flag} className="rs-flag">
          ⚠️ {flag}
        </span>
      ))}
    </div>
  );
}

/** Listen on Spotify, or make the playlist once everyone's song is in. */
function PlaylistButton({
  round,
  league,
}: {
  round: PopulatedRound;
  league: PopulatedLeague;
}) {
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const stageAllows =
    round.stage === 'completed' ||
    round.stage === 'voting' ||
    round.stage === 'currentUserVotingCompleted';
  if (!stageAllows || round.submissions.length < league.users.length) {
    return null;
  }
  // Always goes through the server, which checks the saved playlist still
  // exists and makes a new one if it was deleted.
  const hasPlaylist = Boolean(round.spotifyPlaylistId);
  return (
    <button
      type="button"
      className="rs-spotify"
      disabled={creating}
      onClick={async () => {
        try {
          setCreating(true);
          await openSpotifyPlaylist({ round });
        } catch (err) {
          toast.show({
            title: 'Error opening playlist',
            variant: 'error',
            message: unknownToErrorString(err, 'Error opening playlist'),
          });
        } finally {
          setCreating(false);
        }
      }}
    >
      { }
      <img alt="" src={spotifyLogo.src} width={18} height={18} />
      {creating
        ? hasPlaylist
          ? 'Opening…'
          : 'Making…'
        : hasPlaylist
          ? 'Listen'
          : 'Make playlist'}
    </button>
  );
}

/** Your own upcoming round: change the theme until it opens. */
function EditableTheme({
  round,
  league,
}: {
  round: PopulatedRound;
  league: PopulatedLeague;
}) {
  const toast = useToast();
  const { refreshData } = useData();
  const [title, setTitle] = useState(round.title);
  const [description, setDescription] = useState(round.description);
  const [saving, setSaving] = useState(false);
  const changed = title !== round.title || description !== round.description;
  return (
    <div className="rs-edit">
      <label className="rs-edit-label">
        Your theme
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rs-edit-title"
          placeholder="Name your round"
        />
      </label>
      <textarea
        value={description}
        maxLength={MAX_DESCRIPTION_LENGTH}
        onChange={(e) => setDescription(e.target.value)}
        className="rs-note rs-edit-note"
        placeholder="Tell everyone what to bring"
        rows={3}
      />
      {changed && (
        <button
          type="button"
          className="venue-cta"
          style={{ '--cta': '#7dff9b', color: '#140c24' } as React.CSSProperties}
          disabled={saving || !title.trim()}
          onClick={async () => {
            try {
              setSaving(true);
              const response = await fetch(`/api/leagues/${league._id}/rounds`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roundId: round._id,
                  title,
                  description,
                  isBonusRound: round.isBonusRound,
                  isKickoffRound: round.isKickoffRound,
                }),
              });
              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Error updating round');
              }
              toast.show({ variant: 'success', message: 'Round updated' });
              refreshData('manual');
            } catch (err) {
              toast.show({
                variant: 'error',
                message: unknownToErrorString(err, 'Error updating round'),
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving…' : '💾 Save theme'}
        </button>
      )}
    </div>
  );
}
