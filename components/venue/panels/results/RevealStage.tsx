'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { getPlaceString } from '@/lib/utils/getPlaces';
import type { PopulatedRound } from '@/lib/types';
import { celebrate } from '../../celebrate';
import { getRoundResults } from '../../venueModel';
import { useReducedMotion } from './useRevealSeen';
import './reveal.css';

type Result = ReturnType<typeof getRoundResults>[number];

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const CONFETTI = ['#ff4fd8', '#38e1ff', '#ffb547', '#7dff9b', '#b78cff', '#ff5470'];

/**
 * Reveals a completed round's results from last place to first, one record
 * at a time. `onComplete` fires once everything is out, `onSkip` when the
 * user would rather just see the list.
 */
export function RevealStage({
  round,
  onComplete,
  onSkip,
  onDone,
}: {
  round: PopulatedRound;
  onComplete: () => void;
  onSkip: () => void;
  onDone: () => void;
}) {
  const results = useMemo(() => getRoundResults(round), [round]);
  const reduced = useReducedMotion();
  const total = results.length;
  // how many records are out of their sleeves, counted from the bottom
  const [revealed, setRevealed] = useState(0);
  const shown = reduced ? total : revealed;
  const finished = shown >= total;

  useEffect(() => {
    if (reduced) {
      onComplete();
      return;
    }
    // first record comes out right away; the rest follow on a beat
    const delay = revealed === 0 ? 400 : revealed === total - 1 ? 2600 : 1700;
    if (revealed >= total) {
      celebrate('crates');
      onComplete();
      return;
    }
    const timer = setTimeout(() => setRevealed(revealed + 1), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, total, reduced]);

  const nextIsWinner = !finished && shown === total - 1;
  const heading = finished
    ? 'That’s the show!'
    : nextIsWinner
      ? 'And the winner is…'
      : shown === 0
        ? 'Dropping the needle…'
        : 'Next up…';

  return (
    <div className="rr-stage">
      <div className="rr-heading" data-final={finished}>
        {heading}
      </div>
      <ol className="rr-list">
        {results.map((result, index) => {
          const fromBottom = total - 1 - index;
          const state =
            fromBottom < shown - 1 || (finished && fromBottom < shown)
              ? 'done'
              : fromBottom === shown - 1
                ? 'current'
                : 'hidden';
          return (
            <RevealCard
              key={result.submission._id}
              result={result}
              state={state}
              instant={reduced}
            />
          );
        })}
      </ol>
      {finished && !reduced && <Confetti />}
      <div className="rr-actions">
        {finished ? (
          <button type="button" className="venue-cta" onClick={onDone}>
            See the full breakdown
          </button>
        ) : (
          <button type="button" className="rr-skip" onClick={onSkip}>
            Skip ⏭
          </button>
        )}
      </div>
    </div>
  );
}

function RevealCard({
  result,
  state,
  instant,
}: {
  result: Result;
  state: 'hidden' | 'current' | 'done';
  instant: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const { trackInfo } = result.submission;
  const isRevealed = state !== 'hidden';
  const isWinner = result.place === 1;

  useEffect(() => {
    if (state === 'current' && !instant) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [state, instant]);

  return (
    <li
      ref={ref}
      className="rr-card"
      data-state={state}
      data-winner={isWinner}
      data-instant={instant}
    >
      <div className="rr-place">
        {isRevealed ? (MEDALS[result.place] ?? getPlaceString(result.place)) : '?'}
      </div>
      <div className="rr-record">
        <div className="rr-vinyl" aria-hidden />
        {isRevealed && (
          <img className="rr-art" src={trackInfo.albumImageUrl} alt="" />
        )}
        <div className="rr-sleeve" aria-hidden>
          <span>♪</span>
        </div>
      </div>
      <div className="rr-info">
        <div className="rr-song">{isRevealed ? trackInfo.title : '???'}</div>
        <div className="rr-artist">
          {isRevealed ? trackInfo.artists.join(', ') : 'mystery track'}
        </div>
        <div className="rr-who">
          {isRevealed ? (
            <>
              <Avatar user={result.user} size={6} includeLink={false} />
              <span>{result.user.userName}</span>
            </>
          ) : (
            <span className="rr-who-hidden">who could it be?</span>
          )}
        </div>
      </div>
      <div className="rr-points">
        <b>
          {isRevealed ? (
            <CountUp to={result.points} instant={instant || state === 'done'} />
          ) : (
            '–'
          )}
        </b>
        <small>pts</small>
      </div>
    </li>
  );
}

function CountUp({ to, instant }: { to: number; instant: boolean }) {
  const [value, setValue] = useState(instant ? to : 0);
  useEffect(() => {
    if (instant) {
      return;
    }
    const start = performance.now();
    const duration = 700 + Math.min(to, 40) * 15;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, instant]);
  return <>{instant ? to : value}</>;
}

function Confetti() {
  return (
    <div className="rr-confetti" aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <i
          key={i}
          style={
            {
              '--x': `${(i * 29 + 7) % 100}%`,
              '--delay': `${((i * 13) % 10) / 10}s`,
              '--dur': `${2.2 + ((i * 7) % 10) / 8}s`,
              '--rot': `${(i * 67) % 360}deg`,
              '--c': CONFETTI[i % CONFETTI.length],
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
