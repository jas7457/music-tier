'use client';

import { PopulatedRound } from '@/lib/types';
import { formatDateWithTime } from '@/lib/utils/formatDate';
import { twMerge } from 'tailwind-merge';
import { Avatar } from './Avatar';

/**
 * Shown while a round is running past its deadline because somebody still owes
 * a submission or a vote. Explains why the round hasn't moved on and exactly
 * when the extra time runs out.
 */
export function GracePeriodNotice({
  round,
  className,
}: {
  round: PopulatedRound;
  className?: string;
}) {
  const { gracePeriod } = round;

  if (!gracePeriod) {
    return null;
  }

  const { type, scheduledEndDate, endDate, missingUsers } = gracePeriod;

  const noun = type === 'submission' ? 'Submissions' : 'Voting';
  const verb = type === 'submission' ? 'submitted a song' : 'voted';
  const names = missingUsers.map((user) => user.userName);
  const nameList = (() => {
    if (names.length === 0) {
      return 'Someone';
    }
    if (names.length === 1) {
      return names[0];
    }
    if (names.length === 2) {
      return `${names[0]} and ${names[1]}`;
    }
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  })();
  const haveOrHas = names.length === 1 ? "hasn't" : "haven't";

  return (
    <div
      className={twMerge(
        'flex flex-col gap-2 rounded-control bg-amber-50/80 ring-1 ring-inset ring-amber-600/30 px-3 py-2.5',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-base leading-none mt-px">
          ⏳
        </span>
        <div className="flex flex-col gap-1 text-xs text-amber-900">
          <p className="font-semibold">
            {noun} extended &mdash; {nameList} {haveOrHas} {verb} yet
          </p>
          <p className="text-amber-800">
            {noun} {type === 'submission' ? 'were' : 'was'} due{' '}
            {formatDateWithTime(scheduledEndDate)} and{' '}
            {type === 'submission'
              ? 'stay open an extra 12 hours, until'
              : 'stays open an extra 12 hours, until'}{' '}
            {formatDateWithTime(endDate)}.{' '}
            {type === 'submission'
              ? 'Voting starts once the extension is up.'
              : "The next round can't start until the extension is up."}{' '}
            After that, {type === 'submission' ? 'submissions' : 'voting'}{' '}
            {type === 'submission' ? 'are' : 'is'} locked for good.
          </p>
        </div>
      </div>

      {missingUsers.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-6">
          {missingUsers.map((user) => (
            <Avatar
              key={user._id}
              user={user}
              size={8}
              includeTooltip
              tooltipText={`${user.userName} still needs to ${
                type === 'submission' ? 'submit a song' : 'vote'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
