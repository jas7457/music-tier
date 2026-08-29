import { GRACE_PERIOD_MS, ONE_DAY_MS } from './time';

export type RoundScheduleGracePeriod = {
  // which deadline was missed
  type: 'submission' | 'voting';
  // the deadline the round would have had if everyone was on time
  scheduledEndDate: number;
  // when the extension runs out
  endDate: number;
  // the people the round is waiting on
  missingUserIds: string[];
};

export type RoundScheduleInput = {
  round: {
    submissionStartDate?: number;
    submissionEndDate?: number;
    votingStartDate?: number;
    votingEndDate?: number;
    submissions: Array<{ userId: string; submissionDate: number }>;
    votes: Array<{ userId: string; points: number; voteDate: number }>;
  };
  league: {
    // user ids, in league order
    users: string[];
    daysForSubmission: number;
    daysForVoting: number;
    votesPerRound: number;
  };
  // where this round sits on the league's un-graced timeline
  scheduledStartDate: number;
  // when the previous round's grace period frees this round up to open
  blockedUntil: number;
  now: number;
};

export type RoundSchedule = {
  submissionStartDate: number;
  submissionEndDate: number;
  votingStartDate: number;
  votingEndDate: number;
  // set only while the round is actively running on borrowed time
  gracePeriod: RoundScheduleGracePeriod | null;
  // cascade state for the round that follows this one
  nextScheduledStartDate: number;
  nextBlockedUntil: number;
};

/**
 * Works out when a round opens and closes.
 *
 * Rounds run back to back, so each round hands the next one a
 * `nextScheduledStartDate`. That cascade always follows the *scheduled*
 * timeline, which means a grace period never pushes out a later round's
 * deadlines — only the round that someone was late for gets extra time.
 */
export function getRoundSchedule({
  round,
  league,
  scheduledStartDate,
  blockedUntil,
  now,
}: RoundScheduleInput): RoundSchedule {
  const sortedSubmissions = [...round.submissions].sort(
    (a, b) => a.submissionDate - b.submissionDate,
  );
  const firstSubmission = sortedSubmissions[0];
  const lastSubmission = sortedSubmissions[sortedSubmissions.length - 1];

  const sortedVotes = [...round.votes].sort((a, b) => a.voteDate - b.voteDate);
  const firstVote = sortedVotes[0];
  const lastVote = sortedVotes[sortedVotes.length - 1];

  const usersThatSubmitted = new Set(
    round.submissions.map((submission) => submission.userId),
  );
  const missingSubmissionUserIds = league.users.filter(
    (userId) => !usersThatSubmitted.has(userId),
  );

  const pointsByUserId = round.votes.reduce(
    (acc, vote) => {
      acc[vote.userId] = (acc[vote.userId] ?? 0) + vote.points;
      return acc;
    },
    {} as Record<string, number>,
  );
  const missingVoteUserIds = league.users.filter(
    (userId) => (pointsByUserId[userId] ?? 0) < league.votesPerRound,
  );

  // The timeline the round would run on if nobody was late. Every deadline is
  // derived from this, so grace time stays additive instead of compounding.
  const scheduledSubmissionStartDate = (() => {
    if (round.submissionStartDate) {
      return round.submissionStartDate;
    }

    if (firstSubmission) {
      return Math.min(scheduledStartDate, firstSubmission.submissionDate);
    }
    return scheduledStartDate;
  })();

  const scheduledSubmissionEndDate = (() => {
    if (round.submissionEndDate) {
      return round.submissionEndDate;
    }

    const normalEnd = getEndOfDay(
      scheduledSubmissionStartDate +
        league.daysForSubmission * ONE_DAY_MS -
        60_000,
    );

    if (missingSubmissionUserIds.length === 0 && lastSubmission) {
      return Math.min(normalEnd, lastSubmission.submissionDate);
    }
    return normalEnd;
  })();

  const submissionGrace = getGracePeriod({
    deadline: scheduledSubmissionEndDate,
    missingUserIds: missingSubmissionUserIds,
    now,
  });
  const submissionEndDate =
    submissionGrace?.endDate ?? scheduledSubmissionEndDate;

  const hadNoSubmissions =
    round.submissions.length === 0 && now > submissionEndDate;

  const scheduledVotingStartDate = (() => {
    if (round.votingStartDate) {
      return round.votingStartDate;
    }

    if (hadNoSubmissions) {
      return scheduledSubmissionEndDate;
    }
    if (firstVote) {
      return Math.min(scheduledSubmissionEndDate, firstVote.voteDate);
    }
    return scheduledSubmissionEndDate;
  })();

  const scheduledVotingEndDate = (() => {
    if (round.votingEndDate) {
      return round.votingEndDate;
    }

    if (hadNoSubmissions) {
      return scheduledSubmissionEndDate;
    }

    const normalEnd = getEndOfDay(
      scheduledVotingStartDate + league.daysForVoting * ONE_DAY_MS - 60_000,
    );
    if (missingVoteUserIds.length === 0 && lastVote) {
      return Math.min(normalEnd, lastVote.voteDate);
    }
    return normalEnd;
  })();

  // A submission grace period eats into what would have been voting time: it
  // pushes back when voting opens, but not when voting is due.
  const votingStartDate = Math.max(scheduledVotingStartDate, submissionEndDate);
  const votingGrace = hadNoSubmissions
    ? null
    : getGracePeriod({
        deadline: scheduledVotingEndDate,
        missingUserIds: missingVoteUserIds,
        now,
      });
  const votingEndDate = Math.max(
    votingGrace?.endDate ?? scheduledVotingEndDate,
    votingStartDate,
  );

  // Round the next round's start up to the following midnight when this one
  // finishes at the tail end of a day.
  const nextScheduledStartDate = (() => {
    const maybeTomorrow = getStartOfDay(scheduledVotingEndDate + 3_000);
    if (getStartOfDay(scheduledVotingEndDate) !== maybeTomorrow) {
      return maybeTomorrow;
    }
    return scheduledVotingEndDate;
  })();

  return {
    // The previous round running long holds this one shut, but never moves
    // its deadlines.
    submissionStartDate: Math.max(scheduledSubmissionStartDate, blockedUntil),
    submissionEndDate,
    votingStartDate,
    votingEndDate,
    gracePeriod: (() => {
      if (submissionGrace?.isActive) {
        return {
          type: 'submission' as const,
          scheduledEndDate: scheduledSubmissionEndDate,
          endDate: submissionGrace.endDate,
          missingUserIds: missingSubmissionUserIds,
        };
      }
      if (votingGrace?.isActive) {
        return {
          type: 'voting' as const,
          scheduledEndDate: scheduledVotingEndDate,
          endDate: votingGrace.endDate,
          missingUserIds: missingVoteUserIds,
        };
      }
      return null;
    })(),
    nextScheduledStartDate,
    // Only a voting grace period keeps the round itself alive, so only it
    // holds the next round shut.
    nextBlockedUntil: votingGrace ? votingEndDate : 0,
  };
}

/**
 * A round doesn't move on without everybody. When a deadline passes while
 * someone still owes a submission or a vote, that phase stays open for one
 * extra GRACE_PERIOD_MS.
 *
 * The extension is granted at most once per deadline, it evaporates the moment
 * the stragglers catch up, and once it has run out the phase closes for good.
 * Returns null when no grace is owed.
 */
function getGracePeriod({
  deadline,
  missingUserIds,
  now,
}: {
  deadline: number;
  missingUserIds: string[];
  now: number;
}): { endDate: number; isActive: boolean } | null {
  if (missingUserIds.length === 0 || now <= deadline) {
    return null;
  }

  const endDate = deadline + GRACE_PERIOD_MS;
  return { endDate, isActive: now < endDate };
}

export function getStartOfDay(date: number): number {
  const d = new Date(date);

  // Get the year, month, day in Eastern time for this timestamp
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(d);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;

  // America/New_York uses either EDT (UTC-4) or EST (UTC-5).
  // Determine the correct offset by checking which one actually produces
  // midnight (hour 0) in Eastern time for this date.
  const edtMidnight = new Date(
    `${year}-${month}-${day}T00:00:00-04:00`,
  ).getTime();

  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    hour: '2-digit',
  });

  if (Number(hourFormatter.format(new Date(edtMidnight))) === 0) {
    return edtMidnight;
  }

  return new Date(`${year}-${month}-${day}T00:00:00-05:00`).getTime();
}

export function getEndOfDay(date: number): number {
  // Get start of day, then add 23 hours 59 minutes in milliseconds
  return getStartOfDay(date) + ONE_DAY_MS - 1000;
}
