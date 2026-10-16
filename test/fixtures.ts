import { vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type {
  League,
  OnDeckSongSubmission,
  Round,
  SongSubmission,
  User,
  Vote,
} from '@/databaseTypes';
import { ONE_DAY_MS } from '@/lib/utils/time';
import { fakeDb } from './fakeMongo';

/**
 * Builders that insert documents into the fake database (see fakeMongo.ts).
 * Each returns the stored document so tests can refer to its ids.
 */

let idCounter = 0;
/** Sequential ObjectIds, so `sort({ _id: -1 })` follows insertion order. */
export function nextId(): ObjectId {
  idCounter += 1;
  return new ObjectId(idCounter.toString(16).padStart(24, '0'));
}

export function resetDb() {
  fakeDb.reset();
  idCounter = 0;
}

/**
 * A timestamp for a wall-clock time in New York during June (EDT, UTC-4),
 * e.g. et('2025-06-02T09:30').
 */
export function et(isoLocal: string): number {
  return Date.parse(`${isoLocal}${isoLocal.length === 16 ? ':00' : ''}-04:00`);
}

export const HOUR = 60 * 60 * 1000;
export const DAY = ONE_DAY_MS;

/** Default league start: Monday 2 June 2025, midnight Eastern. */
export const LEAGUE_START = et('2025-06-02T00:00');

/**
 * With the default league settings (3 days to submit, 2 to vote, nobody
 * finishing early), round slot `i` occupies these exact windows.
 */
export function slot(i: number, start = LEAGUE_START) {
  const submissionStartDate = start + i * 5 * DAY;
  return {
    submissionStartDate,
    submissionEndDate: submissionStartDate + 3 * DAY - 1000,
    votingStartDate: submissionStartDate + 3 * DAY - 1000,
    votingEndDate: submissionStartDate + 5 * DAY - 1000,
  };
}

const NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Erin', 'Frank', 'Grace'];

export function addUser(overrides: Partial<User> = {}): User {
  const index = fakeDb.collection('users').docs.length;
  const firstName = NAMES[index % NAMES.length];
  const user: User = {
    _id: nextId(),
    firstName,
    lastName: 'Test',
    userName: firstName.toLowerCase(),
    signupDate: et('2025-01-01T00:00'),
    ...overrides,
  };
  fakeDb.collection<User>('users').insert(user);
  return user;
}

export function addUsers(count: number): User[] {
  return Array.from({ length: count }, () => addUser());
}

export const id = (doc: { _id: ObjectId }) => doc._id.toHexString();

export function addLeague(
  members: User[],
  overrides: Partial<League> = {},
): League {
  const league: League = {
    _id: nextId(),
    title: 'Summer league',
    description: '',
    votesPerRound: 3,
    users: members.map(id),
    leagueStartDate: LEAGUE_START,
    daysForSubmission: 3,
    daysForVoting: 2,
    kickoffRoundUserIds: [],
    bonusRoundUserIds: [],
    // Fixture leagues run every phase to its full window so round dates line
    // up with slot(). Production defaults to true (finish early); tests that
    // cover that pass `autoStartRounds: undefined` or `true`.
    autoStartRounds: false,
    ...overrides,
  };
  fakeDb.collection<League>('leagues').insert(league);
  return league;
}

export function addRound(
  league: League,
  creator: User,
  overrides: Partial<Round> = {},
): Round {
  const round: Round = {
    _id: nextId(),
    leagueId: id(league),
    title: `${creator.firstName}'s round`,
    description: '',
    creatorId: id(creator),
    isBonusRound: false,
    isKickoffRound: false,
    submissionDate: et('2025-05-01T00:00'),
    lastUpdatedDate: et('2025-05-01T00:00'),
    ...overrides,
  };
  fakeDb.collection<Round>('rounds').insert(round);
  return round;
}

export function addSubmission(
  round: Round,
  user: User,
  overrides: Partial<SongSubmission> = {},
): SongSubmission {
  const submission: SongSubmission = {
    _id: nextId(),
    roundId: id(round),
    userId: id(user),
    trackInfo: {
      trackId: `track-${id(user)}-${id(round)}`,
      title: `${user.firstName}'s song`,
      artists: [`${user.firstName}'s band`],
      albumName: 'Album',
      albumImageUrl: 'https://example.com/a.jpg',
    },
    submissionDate: et('2025-06-02T12:00'),
    ...overrides,
  };
  fakeDb.collection<SongSubmission>('songSubmissions').insert(submission);
  return submission;
}

export function addVote(
  round: Round,
  voter: User,
  submission: SongSubmission,
  overrides: Partial<Vote> = {},
): Vote {
  const vote: Vote = {
    _id: nextId(),
    roundId: id(round),
    userId: id(voter),
    submissionId: id(submission),
    points: 3,
    voteDate: et('2025-06-05T12:00'),
    ...overrides,
  };
  fakeDb.collection<Vote>('votes').insert(vote);
  return vote;
}

export function addOnDeck(
  round: Round,
  user: User,
  overrides: Partial<OnDeckSongSubmission> = {},
): OnDeckSongSubmission {
  const onDeck: OnDeckSongSubmission = {
    _id: nextId(),
    roundId: id(round),
    userId: id(user),
    trackInfo: {
      trackId: `ondeck-${id(user)}`,
      title: 'On deck',
      artists: ['Someone'],
      albumName: 'Album',
      albumImageUrl: 'https://example.com/b.jpg',
    },
    isAddedToSidePlaylist: false,
    ...overrides,
  };
  fakeDb
    .collection<OnDeckSongSubmission>('onDeckSongSubmissions')
    .insert(onDeck);
  return onDeck;
}

/**
 * Everyone submits at `submittedAt`, then each member gives all their points
 * to the next member's song at `votedAt`. Returns the submissions in member
 * order.
 */
export function playRound(
  round: Round,
  members: User[],
  { submittedAt, votedAt }: { submittedAt: number; votedAt: number },
): SongSubmission[] {
  const submissions = members.map((member) =>
    addSubmission(round, member, { submissionDate: submittedAt }),
  );
  members.forEach((voter, index) => {
    const target = submissions[(index + 1) % submissions.length];
    addVote(round, voter, target, { voteDate: votedAt });
  });
  return submissions;
}

/** Plays a round inside slot `i` without anyone finishing early. */
export function playRoundInSlot(
  round: Round,
  members: User[],
  i: number,
  leagueStart = LEAGUE_START,
) {
  const s = slot(i, leagueStart);
  return playRound(round, members, {
    submittedAt: s.submissionStartDate + HOUR,
    votedAt: s.votingStartDate + HOUR,
  });
}

/** Freezes Date.now() (only Date is faked, so promises still resolve). */
export function setNow(time: number) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(time);
}
