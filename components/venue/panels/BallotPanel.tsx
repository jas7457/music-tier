'use client';

import VotingRound from '@/components/VotingRound';
import type { PanelProps } from './types';

/** The ballot box: spend your points and guess who brought what. */
export function BallotPanel({ league, user, model, goTo }: PanelProps) {
  const round = model.currentRound;
  if (
    !round ||
    (round.stage !== 'voting' && round.stage !== 'currentUserVotingCompleted')
  ) {
    return (
      <div className="venue-panel">
        <section className="venue-card text-center">
          <div className="text-4xl">🗳️</div>
          <h3 className="font-bold">The ballot box is locked</h3>
          <p className="text-ink-muted text-sm">
            Voting opens once everyone has submitted their song.
          </p>
          {round?.stage === 'submission' && (
            <button type="button" className="venue-cta mt-3" onClick={() => goTo('booth')}>
              💿 Go to the DJ booth
            </button>
          )}
        </section>
      </div>
    );
  }
  return (
    <div className="venue-panel">
      <VotingRound
        key={round.stage}
        round={round}
        league={league}
        currentUser={user}
      />
    </div>
  );
}
