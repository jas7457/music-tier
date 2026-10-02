import { randomUUID } from 'crypto';
import { ObjectId } from 'mongodb';
import type {
  Poll,
  PollAnswer,
  PollOption,
  PollQuestion,
  PollVote,
  User,
} from '@/databaseTypes';
import { getCollection } from './mongodb';
import { sendNotifications } from './notifications';
import type {
  PollQuestionResults,
  PopulatedPoll,
  PopulatedUser,
} from './types';
import {
  MAX_POLL_OPTION_LENGTH,
  MAX_POLL_OPTIONS,
  MAX_POLL_QUESTIONS,
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
function getPollResults(poll: Poll): Record<string, PollQuestionResults> {
  const results: Record<string, PollQuestionResults> = {};
  for (const question of poll.questions) {
    results[question.id] = {
      tallies: Object.fromEntries(
        question.options.map((option) => [option.id, 0]),
      ),
      otherResponses: [],
    };
  }
  for (const vote of poll.votes) {
    for (const answer of vote.answers) {
      const result = results[answer.questionId];
      if (!result) {
        continue;
      }
      for (const optionId of answer.optionIds) {
        result.tallies[optionId] = (result.tallies[optionId] ?? 0) + 1;
      }
      if (answer.otherText) {
        result.otherResponses.push(answer.otherText);
      }
    }
  }
  // Sorted, not in vote order, so they can't be matched up with who voted when.
  for (const result of Object.values(results)) {
    result.otherResponses.sort((a, b) => a.localeCompare(b));
  }
  return results;
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
    questions: poll.questions,
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
  questions: unknown;
  isCreatorAnonymous?: unknown;
  durationHours: unknown;
};

function createId(existing: Set<string>) {
  let id = randomUUID().slice(0, 8);
  while (existing.has(id)) {
    id = randomUUID().slice(0, 8);
  }
  existing.add(id);
  return id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseQuestion(
  input: unknown,
  index: number,
  questionCount: number,
  ids: Set<string>,
): PollQuestion {
  // Only prefix errors with the question number when there's more than one.
  const label = questionCount > 1 ? `Question ${index + 1}: ` : '';
  if (!isRecord(input)) {
    throw new PollError(`${label}Invalid question`, 400);
  }

  const text = typeof input.text === 'string' ? input.text.trim() : '';
  // A lone question can lean on the poll title; with several, each needs text.
  if (!text && questionCount > 1) {
    throw new PollError(`${label}Every question needs text`, 400);
  }
  if (text.length > MAX_POLL_TITLE_LENGTH) {
    throw new PollError(
      `${label}Questions must be ${MAX_POLL_TITLE_LENGTH} characters or less`,
      400,
    );
  }

  const allowOther = input.allowOther === true;
  const allowMultiple = input.allowMultiple === true;

  const optionTexts = Array.isArray(input.options)
    ? input.options
        .filter((option): option is string => typeof option === 'string')
        .map((option) => option.trim())
        .filter(Boolean)
    : [];
  const lowerCased = optionTexts.map((option) => option.toLowerCase());
  if (new Set(lowerCased).size !== lowerCased.length) {
    throw new PollError(`${label}Each choice must be different`, 400);
  }
  if (optionTexts.length > MAX_POLL_OPTIONS) {
    throw new PollError(
      `${label}A question can have at most ${MAX_POLL_OPTIONS} choices`,
      400,
    );
  }
  if (optionTexts.some((option) => option.length > MAX_POLL_OPTION_LENGTH)) {
    throw new PollError(
      `${label}Choices must be ${MAX_POLL_OPTION_LENGTH} characters or less`,
      400,
    );
  }
  // "Other" counts as a choice, so a single option plus Other is allowed.
  if (optionTexts.length + (allowOther ? 1 : 0) < 2) {
    throw new PollError(`${label}Add at least two choices`, 400);
  }

  const options: PollOption[] = optionTexts.map((option) => ({
    id: createId(ids),
    text: option,
  }));

  return {
    id: createId(ids),
    text,
    options,
    allowMultiple,
    allowOther,
  };
}

export async function createPoll(
  input: CreatePollInput,
  creatorId: string,
): Promise<string> {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    throw new PollError('A poll needs a title', 400);
  }
  if (title.length > MAX_POLL_TITLE_LENGTH) {
    throw new PollError(
      `The title must be ${MAX_POLL_TITLE_LENGTH} characters or less`,
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

  const isCreatorAnonymous = input.isCreatorAnonymous === true;

  const questionInputs = Array.isArray(input.questions) ? input.questions : [];
  if (questionInputs.length === 0) {
    throw new PollError('A poll needs at least one question', 400);
  }
  if (questionInputs.length > MAX_POLL_QUESTIONS) {
    throw new PollError(
      `A poll can have at most ${MAX_POLL_QUESTIONS} questions`,
      400,
    );
  }
  // Option and question ids share one namespace so they're unique poll-wide.
  const ids = new Set<string>();
  const questions = questionInputs.map((question, index) =>
    parseQuestion(question, index, questionInputs.length, ids),
  );

  const duration = POLL_DURATION_OPTIONS.find(
    (option) => option.hours === input.durationHours,
  );
  if (!duration) {
    throw new PollError('Invalid poll length', 400);
  }

  const now = Date.now();
  const poll: Poll = {
    _id: new ObjectId(),
    title,
    ...(description ? { description } : {}),
    creatorId,
    isCreatorAnonymous,
    questions,
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
  // one entry per question: { questionId, optionIds, otherText? }
  answers?: unknown;
};

function parseAnswer(
  question: PollQuestion,
  input: Record<string, unknown> | undefined,
  label: string,
): PollAnswer {
  const validOptionIds = new Set(question.options.map((option) => option.id));
  const optionIds = Array.from(
    new Set(
      Array.isArray(input?.optionIds)
        ? input.optionIds.filter((id): id is string => typeof id === 'string')
        : [],
    ),
  );
  if (optionIds.some((id) => !validOptionIds.has(id))) {
    throw new PollError(`${label}Invalid choice`, 400);
  }

  const otherText =
    typeof input?.otherText === 'string' ? input.otherText.trim() : '';
  if (otherText && !question.allowOther) {
    throw new PollError(`${label}Write-in answers aren't allowed`, 400);
  }
  if (otherText.length > MAX_POLL_OTHER_LENGTH) {
    throw new PollError(
      `${label}Your answer must be ${MAX_POLL_OTHER_LENGTH} characters or less`,
      400,
    );
  }

  const selectionCount = optionIds.length + (otherText ? 1 : 0);
  if (selectionCount === 0) {
    throw new PollError(`${label}Pick at least one choice`, 400);
  }
  if (!question.allowMultiple && selectionCount > 1) {
    throw new PollError(`${label}Only one choice is allowed`, 400);
  }

  return {
    questionId: question.id,
    optionIds,
    ...(otherText ? { otherText } : {}),
  };
}

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

  const answerInputs = new Map<string, Record<string, unknown>>();
  if (Array.isArray(input.answers)) {
    for (const answer of input.answers) {
      if (isRecord(answer) && typeof answer.questionId === 'string') {
        answerInputs.set(answer.questionId, answer);
      }
    }
  }
  // Every question must be answered.
  const answers = poll.questions.map((question, index) =>
    parseAnswer(
      question,
      answerInputs.get(question.id),
      poll.questions.length > 1 ? `Question ${index + 1}: ` : '',
    ),
  );

  const vote: PollVote = { userId, answers, voteDate: now };

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
