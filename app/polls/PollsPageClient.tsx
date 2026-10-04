'use client';

import Link from '@/components/AppLink';
import { twMerge } from 'tailwind-merge';
import { Breadcrumb, HomeIcon } from '@/components/Breadcrumb';
import { CreatePoll } from '@/components/polls/CreatePoll';
import {
  PollCreator,
  PollParticipation,
  PollStatusPill,
  PollTiming,
} from '@/components/polls/PollMeta';
import type { PopulatedPoll } from '@/lib/types';
import { usePollClock } from '@/lib/hooks/usePollClock';
import { Pill } from '@/components/Pill';
import { getPollEndDate } from '@/lib/utils/pollStatus';

export function PollsPageClient({
  polls,
  now: initialNow,
}: {
  polls: PopulatedPoll[];
  now: number;
}) {
  const now = usePollClock(polls, initialNow);

  // Open polls you still need to vote in come first, then soonest to close.
  const currentPolls = polls
    .filter((poll) => poll.status !== 'closed')
    .sort((a, b) => {
      const aNeedsVote = a.status === 'open' && !a.hasVoted;
      const bNeedsVote = b.status === 'open' && !b.hasVoted;
      if (aNeedsVote !== bNeedsVote) {
        return aNeedsVote ? -1 : 1;
      }
      return a.endDate - b.endDate;
    });
  const pastPolls = polls
    .filter((poll) => poll.status === 'closed')
    .sort((a, b) => getPollEndDate(b) - getPollEndDate(a));

  return (
    <div className="max-w-4xl mx-auto">
      <Breadcrumb
        items={[
          { label: '', icon: <HomeIcon />, href: '/' },
          { label: 'Polls' },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Polls</h1>
        <p className="text-ink-muted mt-1">
          Weigh in on what&apos;s next for the site. Votes are always anonymous.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <CreatePoll />

        <PollSection
          title="Current"
          polls={currentPolls}
          now={now}
          emptyText="No open polls right now."
        />
        <PollSection
          title="Past"
          polls={pastPolls}
          now={now}
          emptyText="No closed polls yet."
        />
      </div>
    </div>
  );
}

function PollSection({
  title,
  polls,
  now,
  emptyText,
}: {
  title: string;
  polls: PopulatedPoll[];
  now: number;
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold mb-3 text-ink-subtle uppercase tracking-widest">
        {title}
      </h2>
      {polls.length === 0 ? (
        <p className="text-sm text-ink-subtle">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {polls.map((poll) => (
            <li key={poll._id}>
              <PollListItem poll={poll} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PollListItem({ poll, now }: { poll: PopulatedPoll; now: number }) {
  const needsVote = poll.status === 'open' && !poll.hasVoted;
  return (
    <Link
      href={`/polls/${poll._id}`}
      className={twMerge(
        'block p-4 glass bento-tile bento-tile-interactive',
        needsVote && 'ring-2 ring-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex-1 min-w-0 font-semibold text-ink text-lg leading-snug">
          {poll.title}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {needsVote && <Pill status="submission">Vote</Pill>}
          {poll.status === 'open' && poll.hasVoted && (
            <Pill status="pending">Voted</Pill>
          )}
          <PollStatusPill poll={poll} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
        <PollCreator poll={poll} />
        <span aria-hidden="true" className="text-ink-subtle">
          ·
        </span>
        <PollTiming poll={poll} now={now} />
        <span aria-hidden="true" className="text-ink-subtle">
          ·
        </span>
        <PollParticipation poll={poll} />
        {poll.questions.length > 1 && (
          <>
            <span aria-hidden="true" className="text-ink-subtle">
              ·
            </span>
            <span>{poll.questions.length} questions</span>
          </>
        )}
      </div>
    </Link>
  );
}
