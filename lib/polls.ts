import { randomUUID } from 'crypto';
import { ObjectId } from 'mongodb';
import type { Poll, PollOption, PollVote, User } from '@/databaseTypes';
import { getCollection } from './mongodb';
import { sendNotifications } from './notifications';
import type { PopulatedPoll, PopulatedUser } from './types';
import {
  MAX_POLL_OPTION_LENGTH,
  MAX_POLL_OPTIONS,
  MAX_POLL_OTHER_LENGTH,
  MAX_POLL_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  POLL_DURATION_OPTIONS,
  POLL_USER_IDS,
  PRODUCTION_URL,
} from './utils/constants';
import { getPollStatus } from './utils/pollStatus';

const HOUR_MS = 60 * 60 * 1000;

export class PollError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function getPollsCollection() {
  return getCollection<Poll>('polls');
}

/* ------------------------------------------------------------------------ */
/* Reading                                                                   */
/* ------------------------------------------------------------------------ */

/**
 * Only the public profile fields of a creator are sent to the client. Contact
 * info and push subscriptions stay on the server.
 */
function toPublicUser(user: User): PopulatedUser {
  const id = user._id.toString();
  return {
    _id: id,
    firstName: user.firstName,
    lastName: user.lastName,
    userName: user.userName,
    photoUrl: user.photoUrl,
    signupDate: user.signupDate,
    index: Math.max(0, POLL_USER_IDS.indexOf(id)),
  };
}

/** Aggregates votes into anonymous counts. Only called once a poll closes. */
function getPollResults(poll: Poll): NonNullable<PopulatedPoll['results']> {
  const tallies: Record<string, number> = Object.fromEntries(
    poll.options.map((option) => [option.id, 0]),
  );
  const otherResponses: string[] = [];
  for (const vote of poll.votes) {
    for (const optionId of vote.optionIds) {
      tallies[optionId] = (tallies[optionId] ?? 0) + 1;
    }
    if (vote.otherText) {
      otherResponses.push(vote.otherText);
    }
  }
  // Sorted, not in vote order, so they can't be matched up with who voted when.
  otherResponses.sort((a, b) => a.localeCompare(b));
  return { tallies, otherResponses };
}

function toPopulatedPoll(
  poll: Poll,
  viewerId: string,
  creator: User | undefined,
  now: number,
): PopulatedPoll {
  const status = getPollStatus(poll, now);
  return {
    _id: poll._id.toString(),
    title: poll.title,
    description: poll.description,
    creator: !poll.isCreatorAnonymous && creator ? toPublicUser(creator) : null,
    isCreatorAnonymous: poll.isCreatorAnonymous,
    isYours: poll.creatorId === viewerId,
    options: poll.options,
    allowMultiple: poll.allowMultiple,
    allowOther: poll.allowOther,
    createdDate: poll.createdDate,
    startDate: poll.startDate,
    endDate: poll.endDate,
    closedDate: poll.closedDate,
    status,
    hasVoted: poll.votes.some((vote) => vote.userId === viewerId),
    voterCount: poll.votes.length,
    eligibleVoterCount: poll.eligibleUserIds.filter((id) =>
      poll.votes.some((vote) => vote.userId === id),
    ).length,
    eligibleCount: poll.eligibleUserIds.length,
    // Results stay hidden until the poll closes, even from the creator.
    results: status === 'closed' ? getPollResults(poll) : null,
  };
}

async function populatePolls(
  polls: Poll[],
  viewerId: string,
  now: number,
): Promise<PopulatedPoll[]> {
  const creatorIds = Array.from(
    new Set(
      polls
        .filter((poll) => !poll.isCreatorAnonymous)
        .map((poll) => poll.creatorId),
    ),
  );
  const usersCollection = await getCollection<User>('users');
  const creators =
    creatorIds.length > 0
      ? await usersCollection
          .find({ _id: { $in: creatorIds.map((id) => new ObjectId(id)) } })
          .toArray()
      : [];
  const creatorsById = new Map(
    creators.map((user) => [user._id.toString(), user]),
  );

  return polls.map((poll) =>
    toPopulatedPoll(poll, viewerId, creatorsById.get(poll.creatorId), now),
  );
}

/**
 * `now` is the moment statuses were computed at, so the client's countdowns
 * start from the same instant the server used.
 */
export async function getPolls(
  viewerId: string,
): Promise<{ polls: PopulatedPoll[]; now: number }> {
  const pollsCollection = await getPollsCollection();
  const polls = await pollsCollection
    .find({})
    .sort({ createdDate: -1 })
    .toArray();
  const now = Date.now();
  return { polls: await populatePolls(polls, viewerId, now), now };
}

export async function getPoll(
  pollId: string,
  viewerId: string,
): Promise<{ poll: PopulatedPoll; now: number } | null> {
  if (!ObjectId.isValid(pollId)) {
    return null;
  }
  const pollsCollection = await getPollsCollection();
  const poll = await pollsCollection.findOne({ _id: new ObjectId(pollId) });
  if (!poll) {
    return null;
  }
  const now = Date.now();
  const [populated] = await populatePolls([poll], viewerId, now);
  return { poll: populated, now };
}

/* ------------------------------------------------------------------------ */
/* Creating                                                                  */
/* ------------------------------------------------------------------------ */

export type CreatePollInput = {
  title: unknown;
  description?: unknown;
  options: unknown;
  allowMultiple?: unknown;
  allowOther?: unknown;
  isCreatorAnonymous?: unknown;
  durationHours: unknown;
};

function createOptionId(existing: Set<string>) {
  let id = randomUUID().slice(0, 8);
  while (existing.has(id)) {
    id = randomUUID().slice(0, 8);
  }
  existing.add(id);
  return id;
}

export async function createPoll(
  input: CreatePollInput,
  creatorId: string,
): Promise<string> {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    throw new PollError('A poll needs a question', 400);
  }
  if (title.length > MAX_POLL_TITLE_LENGTH) {
    throw new PollError(
      `The question must be ${MAX_POLL_TITLE_LENGTH} characters or less`,
      400,
    );
  }

  const description =
    typeof input.description === 'string' ? input.description.trim() : '';
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new PollError(
      `The description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
      400,
    );
  }

  const allowOther = input.allowOther === true;
  const allowMultiple = input.allowMultiple === true;
  const isCreatorAnonymous = input.isCreatorAnonymous === true;

  const optionTexts = Array.isArray(input.options)
    ? input.options
        .filter((option): option is string => typeof option === 'string')
        .map((option) => option.trim())
        .filter(Boolean)
    : [];
  const lowerCased = optionTexts.map((text) => text.toLowerCase());
  if (new Set(lowerCased).size !== lowerCased.length) {
    throw new PollError('Each choice must be different', 400);
  }
  if (optionTexts.length > MAX_POLL_OPTIONS) {
    throw new PollError(
      `A poll can have at most ${MAX_POLL_OPTIONS} choices`,
      400,
    );
  }
  if (optionTexts.some((text) => text.length > MAX_POLL_OPTION_LENGTH)) {
    throw new PollError(
      `Choices must be ${MAX_POLL_OPTION_LENGTH} characters or less`,
      400,
    );
  }
  // "Other" counts as a choice, so a single option plus Other is allowed.
  if (optionTexts.length + (allowOther ? 1 : 0) < 2) {
    throw new PollError('A poll needs at least two choices', 400);
  }

  const duration = POLL_DURATION_OPTIONS.find(
    (option) => option.hours === input.durationHours,
  );
  if (!duration) {
    throw new PollError('Invalid poll length', 400);
  }

  const optionIds = new Set<string>();
  const options: PollOption[] = optionTexts.map((text) => ({
    id: createOptionId(optionIds),
    text,
  }));

  const now = Date.now();
  const poll: Poll = {
    _id: new ObjectId(),
    title,
    ...(description ? { description } : {}),
    creatorId,
    isCreatorAnonymous,
    options,
    allowMultiple,
    allowOther,
    createdDate: now,
    startDate: now,
    endDate: now + duration.hours * HOUR_MS,
    eligibleUserIds: [...POLL_USER_IDS],
    votes: [],
  };

  const pollsCollection = await getPollsCollection();
  await pollsCollection.insertOne(poll);
  await syncPollNotifications(poll);

  return poll._id.toString();
}

/* ------------------------------------------------------------------------ */
/* Voting                                                                    */
/* ------------------------------------------------------------------------ */

export type CastVoteInput = {
  optionIds?: unknown;
  otherText?: unknown;
};

export async function castVote(
  pollId: string,
  userId: string,
  input: CastVoteInput,
): Promise<void> {
  if (!ObjectId.isValid(pollId)) {
    throw new PollError('Poll not found', 404);
  }
  const pollsCollection = await getPollsCollection();
  const poll = await pollsCollection.findOne({ _id: new ObjectId(pollId) });
  if (!poll) {
    throw new PollError('Poll not found', 404);
  }

  const now = Date.now();
  const status = getPollStatus(poll, now);
  if (status === 'upcoming') {
    throw new PollError("This poll hasn't opened yet", 403);
  }
  if (status === 'closed') {
    throw new PollError('This poll has closed', 403);
  }
  if (poll.votes.some((vote) => vote.userId === userId)) {
    throw new PollError('You have already voted in this poll', 409);
  }

  const validOptionIds = new Set(poll.options.map((option) => option.id));
  const optionIds = Array.from(
    new Set(
      Array.isArray(input.optionIds)
        ? input.optionIds.filter((id): id is string => typeof id === 'string')
        : [],
    ),
  );
  if (optionIds.some((id) => !validOptionIds.has(id))) {
    throw new PollError('Invalid choice', 400);
  }

  const otherText =
    typeof input.otherText === 'string' ? input.otherText.trim() : '';
  if (otherText && !poll.allowOther) {
    throw new PollError('This poll does not allow write-in answers', 400);
  }
  if (otherText.length > MAX_POLL_OTHER_LENGTH) {
    throw new PollError(
      `Your answer must be ${MAX_POLL_OTHER_LENGTH} characters or less`,
      400,
    );
  }

  const selectionCount = optionIds.length + (otherText ? 1 : 0);
  if (selectionCount === 0) {
    throw new PollError('Pick at least one choice', 400);
  }
  if (!poll.allowMultiple && selectionCount > 1) {
    throw new PollError('This poll only allows one choice', 400);
  }

  const vote: PollVote = {
    userId,
    optionIds,
    ...(otherText ? { otherText } : {}),
    voteDate: now,
  };

  // One atomic write. The filter guards against double votes and late votes,
  // even under concurrent requests.
  const result = await pollsCollection.updateOne(
    {
      _id: poll._id,
      'votes.userId': { $ne: userId },
      closedDate: { $exists: false },
      startDate: { $lte: now },
      endDate: { $gt: now },
    },
    { $push: { votes: vote } },
  );

  if (result.modifiedCount === 0) {
    throw new PollError(
      'Your vote could not be recorded. You may have already voted, or the poll has closed.',
      409,
    );
  }

  // Close early once every eligible voter has weighed in.
  const updated = await pollsCollection.findOne({ _id: poll._id });
  if (!updated) {
    return;
  }
  const everyoneVoted = updated.eligibleUserIds.every((id) =>
    updated.votes.some((vote) => vote.userId === id),
  );
  if (everyoneVoted && updated.closedDate === undefined) {
    const closed = await pollsCollection.findOneAndUpdate(
      { _id: poll._id, closedDate: { $exists: false } },
      { $set: { closedDate: Date.now() } },
      { returnDocument: 'after' },
    );
    if (closed) {
      await syncPollNotifications(closed);
    }
  }
}

/* ------------------------------------------------------------------------ */
/* Notifications                                                             */
/* ------------------------------------------------------------------------ */

function getPollLink(poll: Poll) {
  return `${PRODUCTION_URL}/polls/${poll._id.toString()}`;
}

/**
 * Sends whichever lifecycle notifications a poll is due (started / results)
 * that haven't gone out yet. Each one is claimed atomically before sending, so
 * concurrent callers (page views, votes, the cron) never double-send.
 */
export async function syncPollNotifications(poll: Poll): Promise<void> {
  const pollsCollection = await getPollsCollection();
  const status = getPollStatus(poll);
  const link = getPollLink(poll);

  if (status === 'open' && poll.startNotificationSentDate === undefined) {
    const claimed = await pollsCollection.findOneAndUpdate(
      { _id: poll._id, startNotificationSentDate: { $exists: false } },
      { $set: { startNotificationSentDate: Date.now() } },
    );
    if (claimed) {
      const creator =
        !poll.isCreatorAnonymous && ObjectId.isValid(poll.creatorId)
          ? await (
              await getCollection<User>('users')
            ).findOne({ _id: new ObjectId(poll.creatorId) })
          : null;
      const asker = creator ? creator.firstName : 'Someone';
      await sendNotifications([
        {
          code: 'POLL.STARTED',
          // No need to tell the creator about their own poll
          userIds: poll.eligibleUserIds.filter((id) => id !== poll.creatorId),
          title: 'New poll',
          message: `${asker} wants to know: "${poll.title}" Votes are anonymous.`,
          additionalHTML: `<p><a href="${link}">Click here to vote.</a></p>`,
          link,
        },
      ]);
    }
  }

  if (status === 'closed' && poll.resultsNotificationSentDate === undefined) {
    const claimed = await pollsCollection.findOneAndUpdate(
      { _id: poll._id, resultsNotificationSentDate: { $exists: false } },
      { $set: { resultsNotificationSentDate: Date.now() } },
    );
    if (claimed) {
      await sendNotifications([
        {
          code: 'POLL.COMPLETED',
          userIds: poll.eligibleUserIds,
          title: 'Poll results are in',
          message: `The poll "${poll.title}" has closed. See how everyone voted!`,
          additionalHTML: `<p><a href="${link}">Click here to see the results.</a></p>`,
          link,
        },
      ]);
    }
  }
}

/**
 * Finds every poll with an outstanding notification and sends it. Polls close
 * on their own clock, so this runs on page views and from the daily cron.
 */
export async function processPollNotifications(): Promise<void> {
  const now = Date.now();
  const pollsCollection = await getPollsCollection();
  const duePolls = await pollsCollection
    .find({
      $or: [
        {
          startNotificationSentDate: { $exists: false },
          startDate: { $lte: now },
          endDate: { $gt: now },
          closedDate: { $exists: false },
        },
        {
          resultsNotificationSentDate: { $exists: false },
          $or: [{ endDate: { $lte: now } }, { closedDate: { $exists: true } }],
        },
      ],
    })
    .toArray();

  for (const poll of duePolls) {
    await syncPollNotifications(poll);
  }
}
