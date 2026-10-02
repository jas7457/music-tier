'use client';

import type { PopulatedPoll } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Pill } from '@/components/Pill';
import { formatDuration } from '@/lib/hooks/usePollClock';
import { formatDateWithTime } from '@/lib/utils/formatDate';
import { getPollEndDate } from '@/lib/utils/pollStatus';

export function PollStatusPill({ poll }: { poll: PopulatedPoll }) {
  switch (poll.status) {
    case 'open':
      return <Pill status="active">Open</Pill>;
    case 'upcoming':
      return <Pill status="upcoming">Upcoming</Pill>;
    case 'closed':
      return <Pill status="completed">Closed</Pill>;
  }
}

/** "Closes in 5h 12m", "Opens in 2d", "Closed Mar 3, 2026, 4:12 PM" */
export function PollTiming({
  poll,
  now,
}: {
  poll: PopulatedPoll;
  now: number;
}) {
  switch (poll.status) {
    case 'open':
      return (
        <span title={formatDateWithTime(poll.endDate)}>
          Closes in {formatDuration(poll.endDate - now)}
        </span>
      );
    case 'upcoming':
      return (
        <span title={formatDateWithTime(poll.startDate)}>
          Opens in {formatDuration(poll.startDate - now)}
        </span>
      );
    case 'closed':
      return <span>Closed {formatDateWithTime(getPollEndDate(poll))}</span>;
  }
}

export function PollCreator({ poll }: { poll: PopulatedPoll }) {
  if (poll.creator) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Avatar user={poll.creator} size={5} includeLink={false} />
        <span>{poll.isYours ? 'You' : poll.creator.firstName}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-5 h-5 rounded-full bg-ink/10 text-ink-muted flex items-center justify-center">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </span>
      <span>{poll.isYours ? 'You (anonymous)' : 'Anonymous'}</span>
    </span>
  );
}

/** "2 of 8 voted · 6 left" */
export function PollParticipation({ poll }: { poll: PopulatedPoll }) {
  const remaining = poll.eligibleCount - poll.eligibleVoterCount;
  return (
    <span>
      {poll.eligibleVoterCount} of {poll.eligibleCount} voted
      {poll.status === 'open' && remaining > 0 && (
        <span className="text-ink-subtle"> · {remaining} left</span>
      )}
    </span>
  );
}
