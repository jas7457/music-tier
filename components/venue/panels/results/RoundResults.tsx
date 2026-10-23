'use client';

import { useMemo, useState } from 'react';
import CompletedRound from '@/components/CompletedRound';
import { BallotBox } from '../ballot/BallotBox';
import { RoundInfo } from '@/components/RoundInfo';
import { ToggleButton } from '@/components/ToggleButton';
import type {
  PopulatedLeague,
  PopulatedRound,
  PopulatedUser,
} from '@/lib/types';
import { getRoundResults } from '../../venueModel';
import { RevealStage } from './RevealStage';
import { markRevealSeen, useRevealSeen } from './useRevealSeen';
import { getOnDeckInfo, OnDeckSubmissionsList } from '@/components/OnDeckSubmissions';
import './reveal.css';

type Phase = 'intro' | 'playing' | 'full';

/**
 * A completed round in the crates: the first visit is a results reveal,
 * after that it's the full results (or your votes).
 */
export function RoundResults({
  round,
  league,
  user,
  openRound,
}: {
  round: PopulatedRound;
  league: PopulatedLeague;
  user: PopulatedUser;
  openRound: (roundId: string) => void;
}) {
  const seen = useRevealSeen(user._id, round._id);
  const hasResults = useMemo(
    () => getRoundResults(round).length > 0,
    [round],
  );
  // once the user does something, that wins over what localStorage says
  const [phaseOverride, setPhaseOverride] = useState<Phase | null>(null);
  const [showVotes, setShowVotes] = useState(false);

  const phase: Phase | null =
    phaseOverride ??
    (seen === 'unknown' ? null : seen === 'new' && hasResults ? 'intro' : 'full');

  const previousRoundId = round.previousRound?._id;
  const nextRoundId = round.nextRound?._id;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-1">
        {(previousRoundId || nextRoundId) && (
          <div className="rr-nav">
            <div className="truncate">
              {round.previousRound && previousRoundId && (
                <button
                  type="button"
                  onClick={() => openRound(previousRoundId)}
                >
                  ← Round {round.previousRound.roundIndex + 1}
                </button>
              )}
            </div>
            <div className="truncate text-right">
              {round.nextRound && nextRoundId && (
                <button type="button" onClick={() => openRound(nextRoundId)}>
                  Round {round.nextRound.roundIndex + 1} →
                </button>
              )}
            </div>
          </div>
        )}
        <RoundInfo league={league} round={round} />
      </div>

      {phase === 'intro' && (
        <div className="rr-intro">
          <div className="rr-intro-stack" aria-hidden>
            {['?', '?', '?'].map((mark, i) => (
              <span
                key={i}
                style={
                  {
                    '--r': `${(i - 1) * 9}deg`,
                    '--d': `${i * 0.25}s`,
                  } as React.CSSProperties
                }
              >
                {mark}
              </span>
            ))}
          </div>
          <h3>The results are in</h3>
          <p>
            {round.submissions.length} records are still sealed in their
            sleeves. Ready to see who won?
          </p>
          <button
            type="button"
            className="rr-reveal-btn"
            onClick={() => setPhaseOverride('playing')}
          >
            Reveal the results
          </button>
          <button
            type="button"
            className="rr-link"
            onClick={() => {
              markRevealSeen(user._id, round._id);
              setPhaseOverride('full');
            }}
          >
            Skip, just show me
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <RevealStage
          round={round}
          onComplete={() => markRevealSeen(user._id, round._id)}
          onSkip={() => {
            markRevealSeen(user._id, round._id);
            setPhaseOverride('full');
          }}
          onDone={() => setPhaseOverride('full')}
        />
      )}

      {phase === 'full' && (
        <>
          <div className="rr-tools">
            <ToggleButton
              onClick={() => setShowVotes(false)}
              selected={!showVotes}
            >
              Results
            </ToggleButton>
            <ToggleButton
              onClick={() => setShowVotes(true)}
              selected={showVotes}
            >
              Your Votes
            </ToggleButton>
            {hasResults && (
              <button
                type="button"
                className="rr-replay"
                onClick={() => setPhaseOverride('playing')}
              >
                ↻ Replay
              </button>
            )}
          </div>
          {showVotes ? (
            <BallotBox
              key={round._id}
              round={round}
              league={league}
              currentUser={user}
            />
          ) : (
            <CompletedRound round={round} users={league.users} />
          )}
          {getOnDeckInfo({ round, isRoundPage: true, isGeneralRoundSlot: true })
            .isVisible && <OnDeck round={round} />}
        </>
      )}
    </div>
  );
}

/** Your on-deck songs for the round, which can go on the side playlist. */
function OnDeck({ round }: { round: PopulatedRound }) {
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
