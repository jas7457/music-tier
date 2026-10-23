'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { celebrate } from '../celebrate';
import { SongSubmission } from '@/components/SongSubmission';
import { SubmittedUsers, UnsubmittedUsers } from '@/components/SubmittedUsers';
import { OnDeckSubmissionsList, getOnDeckInfo } from '@/components/OnDeckSubmissions';
import { formatDateWithTime } from '@/lib/utils/formatDate';
import './booth.css';
import type { PopulatedRound, PopulatedUser } from '@/lib/types';
import type { PanelProps } from './types';

/** The DJ booth: drop your song for the current round, stash on-deck picks. */
export function BoothPanel({ league, model, goTo, openRound }: PanelProps) {
  const round = model.currentRound;
  const onDeckRounds = league.rounds.upcoming.filter(
    (r) => getOnDeckInfo({ round: r, isRoundPage: true, isGeneralRoundSlot: false }).isVisible,
  );

  return (
    <div className="venue-panel">
      {round?.stage === 'submission' && round._id ? (
        <BoothSubmission round={round} league={league} />
      ) : round?.stage === 'submission' ? (
        <section className="venue-card text-center">
          <div className="text-4xl">✍️</div>
          <p className="text-ink-muted text-sm">
            {round.creatorObject.userName} still needs to write the round before
            the decks open.
          </p>
        </section>
      ) : round?.userSubmission ? (
        <section className="venue-card">
          <div className="venue-eyebrow" style={{ color: '#0ea5c6' }}>
            Round {round.roundIndex + 1} · {round.title}
          </div>
          <Deck round={round} locked />
          {(round.stage === 'voting' ||
            round.stage === 'currentUserVotingCompleted') && (
            <button
              type="button"
              className="venue-cta"
              style={{ '--cta': '#f59e0b' } as React.CSSProperties}
              onClick={() => goTo('ballot')}
            >
              🗳️{' '}
              {round.stage === 'voting'
                ? 'Submissions are closed. Go vote!'
                : 'See how the voting is going'}
            </button>
          )}
        </section>
      ) : (
        <section className="venue-card text-center">
          <div className="text-4xl">🎧</div>
          <h3 className="font-bold">The decks are closed</h3>
          <p className="text-ink-muted text-sm">
            Submissions open when the next round starts.
          </p>
        </section>
      )}

      {/* during submissions SongSubmission shows the on-deck list itself */}
      {round && getOnDeckInfo({ round, isRoundPage: true, isGeneralRoundSlot: true }).isVisible && (
        <section className="venue-card">
          <OnDeckFor round={round} />
        </section>
      )}

      {onDeckRounds.length > 0 && (
        <section>
          <h3 className="venue-section-title">Dig ahead: upcoming rounds</h3>
          <p className="text-xs text-ink-subtle mb-2">
            Stash maybe-picks for rounds that haven&apos;t opened yet. They&apos;ll
            be waiting here when submissions open.
          </p>
          <div className="grid gap-2">
            {onDeckRounds.map((r) => (
              <button
                key={r._id}
                type="button"
                className="venue-row"
                onClick={() => openRound(r._id)}
              >
                <span className="text-2xl" aria-hidden>📀</span>
                <div className="min-w-0 text-left">
                  <div className="font-semibold truncate">
                    Round {r.roundIndex + 1}: {r.title || 'Theme under wraps'}
                  </div>
                  <div className="text-xs text-ink-subtle">
                    by {r.creatorObject.userName} ·{' '}
                    {r.onDeckSubmissions.length === 0
                      ? 'nothing stashed yet'
                      : `${r.onDeckSubmissions.length} stashed`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OnDeckFor({ round }: { round: PopulatedRound }) {
  const [onDeck, setOnDeck] = useState<
    Parameters<typeof OnDeckSubmissionsList>[0]['onDeckSubmissions']
  >(round.onDeckSubmissions);
  // keep in sync with refreshed data, as components/Round.tsx does
  const [synced, setSynced] = useState(round.onDeckSubmissions);
  if (synced !== round.onDeckSubmissions) {
    setSynced(round.onDeckSubmissions);
    setOnDeck(round.onDeckSubmissions);
  }
  return (
    <OnDeckSubmissionsList
      round={round}
      isRoundPage
      onDeckSubmissions={onDeck}
      onUpdate={setOnDeck}
    />
  );
}

/**
 * Submitting your song for a round that's open: the deck, the crate of who's
 * in, and the submission form. Used by the DJ booth and the record crates.
 */
export function BoothSubmission({
  round,
  league,
}: {
  round: PopulatedRound;
  league: PanelProps['league'];
}) {
  return (
    <section className="venue-card">
      <div className="venue-eyebrow" style={{ color: '#0ea5c6' }}>
        Round {round.roundIndex + 1} · {round.title}
      </div>
      <Deck round={round} />
      <RecordCrate round={round} users={league.users} />
      <Fragment key={round.userSubmission?.trackInfo.trackId ?? 'none'}>
        <SongSubmission round={round} isRoundPage />
      </Fragment>
      {league.autoStartRounds === false &&
        league.users.every((u) => round.submissions.some((s) => s.userId === u._id)) && (
          <p className="text-sm text-ink-muted mt-2">
            Everyone&apos;s submitted! Voting opens {formatDateWithTime(round.submissionEndDate)}.
          </p>
        )}
      <details className="mt-3">
        <summary className="text-xs font-semibold text-ink-subtle cursor-pointer">
          Who&apos;s in, who&apos;s not
        </summary>
        <div className="mt-2 grid gap-2">
          <SubmittedUsers submissions={round.submissions} users={league.users} />
          <UnsubmittedUsers submissions={round.submissions} users={league.users} />
        </div>
      </details>
    </section>
  );
}

/** Your record on the turntable: spins once you've dropped a track. */
function Deck({
  round,
  locked = false,
}: {
  round: PopulatedRound;
  // submissions are over: it's your pick for the round, no swapping
  locked?: boolean;
}) {
  const track = round.userSubmission?.trackInfo;
  // a new or changed submission gets a confetti burst over the booth
  const lastTrack = useRef(track?.trackId);
  useEffect(() => {
    if (track?.trackId && track.trackId !== lastTrack.current) {
      celebrate('booth');
    }
    lastTrack.current = track?.trackId;
  }, [track?.trackId]);

  return (
    <div className="booth-deck" data-playing={track ? true : undefined}>
      <div className="booth-platter">
        <div className="booth-vinyl">
          {track?.albumImageUrl ? (
             
            <img src={track.albumImageUrl} alt="" />
          ) : (
            <span aria-hidden>?</span>
          )}
        </div>
        <div className="booth-arm" aria-hidden />
      </div>
      <div className="min-w-0">
        {track ? (
          <>
            <div className="booth-kicker">
              {locked ? 'Your pick this round' : 'Now spinning'}
            </div>
            <div className="font-black text-lg leading-tight truncate">{track.title}</div>
            <div className="text-sm text-ink-muted truncate">{track.artists.join(', ')}</div>
            <div className="text-xs text-ink-subtle mt-1">
              {locked
                ? 'Locked in. Everyone’s voting on it now.'
                : 'You can swap it until the deadline.'}
            </div>
          </>
        ) : (
          <>
            <div className="booth-kicker">The deck is empty</div>
            <div className="font-black text-lg leading-tight">Drop your track</div>
            <div className="text-sm text-ink-muted">Search below or paste a Spotify link.</div>
          </>
        )}
      </div>
    </div>
  );
}

/** One slot per player; filled slots show who's already dropped a record. */
function RecordCrate({
  round,
  users,
}: {
  round: PopulatedRound;
  users: PopulatedUser[];
}) {
  const submitted = new Set(round.submissions.map((s) => s.userId));
  const count = users.filter((u) => submitted.has(u._id)).length;
  return (
    <div className="booth-crate">
      <div className="booth-crate-head">
        <span>Records in the crate</span>
        <span className="tabular-nums font-black">
          {count}/{users.length}
        </span>
      </div>
      <div className="booth-crate-slots">
        {users.map((user) => (
          <div
            key={user._id}
            className="booth-slot"
            data-filled={submitted.has(user._id) || undefined}
            title={`${user.userName} ${submitted.has(user._id) ? 'is in' : 'still choosing'}`}
          >
            <Avatar user={user} size={7} includeLink={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
