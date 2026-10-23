'use client';

import { Fragment, useState } from 'react';
import { SongSubmission } from '@/components/SongSubmission';
import { SubmittedUsers, UnsubmittedUsers } from '@/components/SubmittedUsers';
import { OnDeckSubmissionsList, getOnDeckInfo } from '@/components/OnDeckSubmissions';
import { formatDateWithTime } from '@/lib/utils/formatDate';
import type { PopulatedRound } from '@/lib/types';
import type { PanelProps } from './types';

/** The DJ booth: drop your song for the current round, stash on-deck picks. */
export function BoothPanel({ league, model, openRound }: PanelProps) {
  const round = model.currentRound;
  const onDeckRounds = league.rounds.upcoming.filter(
    (r) => getOnDeckInfo({ round: r, isRoundPage: true, isGeneralRoundSlot: false }).isVisible,
  );

  return (
    <div className="venue-panel">
      {round?.stage === 'submission' && round._id ? (
        <section className="venue-card">
          <div className="venue-eyebrow" style={{ color: '#0ea5c6' }}>
            Round {round.roundIndex + 1} · {round.title}
          </div>
          <Fragment key={round.userSubmission?.trackInfo.trackId ?? 'none'}>
            <SongSubmission round={round} isRoundPage />
          </Fragment>
          {league.autoStartRounds === false &&
            league.users.every((u) => round.submissions.some((s) => s.userId === u._id)) && (
              <p className="text-sm text-ink-muted mt-2">
                Everyone&apos;s submitted! Voting opens {formatDateWithTime(round.submissionEndDate)}.
              </p>
            )}
          <div className="mt-3 grid gap-2">
            <SubmittedUsers submissions={round.submissions} users={league.users} />
            <UnsubmittedUsers submissions={round.submissions} users={league.users} />
          </div>
        </section>
      ) : round?.stage === 'submission' ? (
        <section className="venue-card text-center">
          <div className="text-4xl">✍️</div>
          <p className="text-ink-muted text-sm">
            {round.creatorObject.userName} still needs to write the round before
            the decks open.
          </p>
        </section>
      ) : (
        <section className="venue-card text-center">
          <div className="text-4xl">🎧</div>
          <h3 className="font-bold">The decks are closed</h3>
          <p className="text-ink-muted text-sm">
            {round?.userSubmission
              ? `You played “${round.userSubmission.trackInfo.title}” this round.`
              : 'Submissions open when the next round starts.'}
          </p>
        </section>
      )}

      {round && getOnDeckInfo({ round, isRoundPage: true, isGeneralRoundSlot: false }).isVisible && (
        <OnDeckFor round={round} />
      )}

      {onDeckRounds.length > 0 && (
        <section>
          <h3 className="venue-section-title">Dig ahead: upcoming rounds</h3>
          <p className="text-xs text-ink-subtle mb-2">
            Stash songs on deck for rounds that haven&apos;t opened yet.
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
                    Round {r.roundIndex + 1}: {r.title}
                  </div>
                  <div className="text-xs text-ink-subtle">
                    {r.onDeckSubmissions.length} on deck
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
  return (
    <OnDeckSubmissionsList
      round={round}
      isRoundPage
      onDeckSubmissions={onDeck}
      onUpdate={setOnDeck}
    />
  );
}
