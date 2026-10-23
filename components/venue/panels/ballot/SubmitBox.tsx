'use client';

import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { celebrate } from '../../celebrate';
import { prefersReducedMotion } from './flyChip';
import type { useBallot } from './useBallot';

type Ballot = ReturnType<typeof useBallot>;

/** Step 3: slide the ballot envelope into the slot, then really submit. */
export function SubmitBox({ ballot }: { ballot: Ballot }) {
  const [dropping, setDropping] = useState(false);
  const ready = ballot.remainingVotes === 0;

  return (
    <section className="venue-card" style={{ display: 'grid', gap: 12 }}>
      <div className="venue-section-title" style={{ marginBottom: 0 }}>
        Drop it in the box
      </div>
      <div className="ballot-dropzone" aria-hidden>
        <div
          className={twMerge(
            'ballot-envelope',
            ready && !dropping && 'is-ready',
            dropping && 'is-dropping',
          )}
        />
        <div className="ballot-slot" />
      </div>
      <button
        type="button"
        className="venue-cta"
        disabled={!ready || dropping || ballot.saving}
        style={!ready ? { opacity: 0.5 } : undefined}
        onClick={async () => {
          setDropping(true);
          const wait = new Promise((resolve) =>
            setTimeout(resolve, prefersReducedMotion() ? 0 : 800),
          );
          const [ok] = await Promise.all([ballot.save(), wait]);
          if (ok) {
            celebrate('ballot');
            ballot.setStep('submitted');
          } else {
            setDropping(false);
          }
        }}
      >
        {dropping ? 'Dropping it in…' : '🗳️ Drop it in the box'}
      </button>
    </section>
  );
}
