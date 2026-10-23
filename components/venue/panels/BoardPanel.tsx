'use client';

import Link from '@/components/AppLink';
import { PollStatusPill } from '@/components/polls/PollMeta';
import type { PanelProps } from './types';

/** The corkboard: polls pinned up for everyone. */
export function BoardPanel({ polls }: PanelProps) {
  if (!polls) {
    return (
      <div className="venue-panel">
        <p className="text-sm text-ink-muted">Loading polls…</p>
      </div>
    );
  }
  const open = polls.filter((poll) => poll.status !== 'closed');
  const closed = polls.filter((poll) => poll.status === 'closed').slice(0, 8);

  return (
    <div className="venue-panel">
      <Link href="/polls" className="venue-cta text-center">
        📌 Pin up a new poll
      </Link>
      {[
        { title: 'Pinned up now', list: open },
        { title: 'Old notes', list: closed },
      ].map(
        (group) =>
          group.list.length > 0 && (
            <section key={group.title}>
              <h3 className="venue-section-title">{group.title}</h3>
              <div className="venue-notes">
                {group.list.map((poll, i) => (
                  <Link
                    key={poll._id}
                    href={`/polls/${poll._id}`}
                    className="venue-note"
                    style={{ '--tilt': `${((i * 37) % 7) - 3}deg` } as React.CSSProperties}
                    data-needs-vote={(poll.status === 'open' && !poll.hasVoted) || undefined}
                  >
                    <span className="venue-note-pin" aria-hidden />
                    <span className="font-bold leading-snug">{poll.title}</span>
                    <span className="mt-auto flex items-center justify-between gap-1 text-xs">
                      <PollStatusPill poll={poll} />
                      <span className="text-ink-subtle">
                        {poll.voterCount} vote{poll.voterCount === 1 ? '' : 's'}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ),
      )}
      {open.length === 0 && closed.length === 0 && (
        <p className="text-sm text-ink-muted text-center">Nothing pinned yet.</p>
      )}
    </div>
  );
}
