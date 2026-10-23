'use client';

import { useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import type { PopulatedRound, PopulatedUser } from '@/lib/types';
import { flyChip } from './flyChip';
import type { useBallot } from './useBallot';
import { CardExtras, Chip, Pile, TrackArt, TrackInfo } from './parts';

type Ballot = ReturnType<typeof useBallot>;

/** Step 1: spend chips on the records you love. */
export function VoteStep({
  round,
  votesPerRound,
  currentUser,
  ballot,
}: {
  round: PopulatedRound;
  votesPerRound: number;
  currentUser: PopulatedUser;
  ballot: Ballot;
}) {
  const trayRef = useRef<HTMLDivElement>(null);
  const piles = useRef<Record<string, HTMLElement | null>>({});
  const { remainingVotes, votes, saving } = ballot;

  const add = (submissionId: string) => {
    if (remainingVotes <= 0 || saving) {
      return;
    }
    const available = trayRef.current?.querySelectorAll(
      '.ballot-chip:not(.is-spent)',
    );
    flyChip(
      available?.[available.length - 1],
      piles.current[submissionId],
      remainingVotes - 1,
    );
    ballot.changeVote(submissionId, 1);
  };

  const remove = (submissionId: string) => {
    if ((votes[submissionId]?.points ?? 0) <= 0 || saving) {
      return;
    }
    flyChip(
      piles.current[submissionId],
      trayRef.current?.querySelector('.ballot-chip.is-spent'),
      remainingVotes,
    );
    ballot.changeVote(submissionId, -1);
  };

  return (
    <>
      <div ref={trayRef} className="ballot-tray" aria-live="polite">
        <div className="ballot-tray-label">
          Chips
          <b>
            {remainingVotes}/{votesPerRound}
          </b>
        </div>
        <div className="ballot-tray-chips">
          {Array.from({ length: votesPerRound }, (_, i) => (
            <Chip
              key={i}
              tone={i}
              className={i >= remainingVotes ? 'is-spent' : undefined}
            />
          ))}
        </div>
        {remainingVotes === 0 && (
          <button
            type="button"
            className="ballot-tray-next"
            onClick={() => ballot.setStep('guessing')}
          >
            Next: guess who →
          </button>
        )}
      </div>
      <p className="ballot-hint">
        Tap a record to drop a chip on it. Tap the stack to take one back.
      </p>

      {round.submissions.map((submission) => {
        const mine = submission.userId === currentUser._id;
        const count = votes[submission._id]?.points || 0;
        return (
          <div
            key={submission._id}
            className={twMerge(
              'ballot-card',
              mine && 'is-mine',
              count > 0 && 'has-chips',
            )}
          >
            <div className="ballot-card-row">
              <TrackArt submission={submission} round={round} />
              {mine ? (
                <div className="ballot-hit">
                  <TrackInfo submission={submission} />
                  <span className="ballot-mine-tag">Your track</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="ballot-hit"
                  disabled={remainingVotes <= 0 || saving}
                  aria-label={`Drop a chip on ${submission.trackInfo.title}`}
                  onClick={() => add(submission._id)}
                >
                  <TrackInfo submission={submission} />
                </button>
              )}
              {!mine && (
                <div className="ballot-pile-zone">
                  <button
                    type="button"
                    disabled={count === 0 || saving}
                    aria-label={`Take a chip back from ${submission.trackInfo.title} (${count} on it)`}
                    onClick={() => remove(submission._id)}
                  >
                    <Pile
                      count={count}
                      pileRef={(el) => {
                        piles.current[submission._id] = el;
                      }}
                    />
                  </button>
                  <button
                    type="button"
                    className="ballot-plus"
                    disabled={remainingVotes <= 0 || saving}
                    aria-label={`Add a chip to ${submission.trackInfo.title}`}
                    onClick={() => add(submission._id)}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            <CardExtras
              submission={submission}
              note={votes[submission._id]?.note || ''}
              disabled={saving}
              onNoteChange={(note) => ballot.setNote(submission._id, note)}
              placeholder={
                mine
                  ? 'Add a comment about your submission (optional)...'
                  : 'Add a note about why you voted for this track (optional)...'
              }
            />
          </div>
        );
      })}
    </>
  );
}
