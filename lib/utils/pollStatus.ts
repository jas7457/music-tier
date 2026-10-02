import type { Poll } from '@/databaseTypes';

export type PollStatus = 'upcoming' | 'open' | 'closed';

/**
 * A poll's status is always derived from its dates rather than stored, so it
 * flips to closed the moment endDate passes, without waiting on any job.
 */
export function getPollStatus(
  poll: Pick<Poll, 'startDate' | 'endDate' | 'closedDate'>,
  now = Date.now(),
): PollStatus {
  if (poll.closedDate !== undefined || now >= poll.endDate) {
    return 'closed';
  }
  if (now < poll.startDate) {
    return 'upcoming';
  }
  return 'open';
}

/** When the poll actually stopped (or will stop) taking votes. */
export function getPollEndDate(
  poll: Pick<Poll, 'endDate' | 'closedDate'>,
): number {
  return poll.closedDate !== undefined
    ? Math.min(poll.closedDate, poll.endDate)
    : poll.endDate;
}
