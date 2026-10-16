import { beforeEach, describe, expect, it } from 'vitest';
import {
  HOUR,
  LEAGUE_START,
  addLeague,
  addOnDeck,
  addRound,
  addSubmission,
  addUsers,
  addVote,
  et,
  id,
  resetDb,
  setNow,
} from '../fixtures';
import { seededShuffle } from '@/lib/utils/seededShuffle';
import { loadHomeLeague, roundsInOrder } from './helpers';

const DURING_VOTING = et('2025-06-05T12:00');
const LONG_AFTER = et('2025-06-30T12:00');

beforeEach(() => {
  resetDb();
});

/** Five members; everyone has submitted to the first round. */
function submittedRound() {
  const users = addUsers(5);
  const league = addLeague(users);
  const rounds = users.map((u) => addRound(league, u));
  const submissions = users.map((u) =>
    addSubmission(rounds[0], u, { submissionDate: LEAGUE_START + HOUR }),
  );
  return { users, league, round: rounds[0], submissions };
}

async function firstRound(viewer: Parameters<typeof loadHomeLeague>[0]) {
  return roundsInOrder(await loadHomeLeague(viewer))[0];
}

describe('submission order', () => {
  it('shuffles submissions (deterministically) while a round is in progress', async () => {
    const { users, submissions } = submittedRound();
    setNow(DURING_VOTING);

    const round = await firstRound(users[0]);
    const insertionOrder = submissions.map(id);

    expect(round.submissions.map((s) => s._id)).toEqual(
      seededShuffle(insertionOrder),
    );
    expect(round.submissions.map((s) => s._id)).not.toEqual(insertionOrder);
  });

  it('shows completed rounds in original order, leaving out people who did not vote', async () => {
    const { users, round, submissions } = submittedRound();
    const [alice, bob, carol, dave, erin] = users;
    // Everyone but Erin votes; Dave's vote is for Erin's song.
    addVote(round, alice, submissions[1]);
    addVote(round, bob, submissions[2]);
    addVote(round, carol, submissions[3]);
    addVote(round, dave, submissions[4]);
    setNow(LONG_AFTER);

    const populated = await firstRound(alice);

    expect(populated.stage).toBe('completed');
    expect(populated.submissions.map((s) => s.userId)).toEqual(
      [alice, bob, carol, dave].map(id),
    );
    // The vote for Erin's (dropped) song goes too.
    expect(populated.votes.map((v) => v.userId)).toEqual(
      [alice, bob, carol].map(id),
    );
    expect(populated.submissions.map((s) => s.userId)).not.toContain(id(erin));
  });
});

describe('populated fields', () => {
  it("sets userSubmission to the viewer's own submission", async () => {
    const { users, submissions } = submittedRound();
    setNow(DURING_VOTING);

    const round = await firstRound(users[2]);
    expect(round.userSubmission?._id).toBe(id(submissions[2]));
  });

  it('leaves userSubmission undefined when the viewer has not submitted', async () => {
    const [alice, bob] = addUsers(2);
    const league = addLeague([alice, bob]);
    const round = addRound(league, alice);
    addRound(league, bob);
    addSubmission(round, bob);
    setNow(et('2025-06-03T12:00'));

    expect((await firstRound(alice)).userSubmission).toBeUndefined();
  });

  it('attaches user objects to submissions, votes and the round creator', async () => {
    const { users, round, submissions } = submittedRound();
    addVote(round, users[1], submissions[0]);
    setNow(DURING_VOTING);

    const populated = await firstRound(users[0]);

    expect(populated.creatorObject.firstName).toBe('Alice');
    for (const submission of populated.submissions) {
      expect(submission.userObject?._id).toBe(submission.userId);
    }
    expect(populated.votes).toHaveLength(1);
    expect(populated.votes[0].userObject.firstName).toBe('Bob');
    expect(populated.votes[0].userGuessObject).toBeUndefined();
  });

  it('collects "who submitted this?" guesses onto each submission', async () => {
    const { users, round, submissions } = submittedRound();
    const [alice, bob, carol] = users;
    // Bob votes for Alice's song and guesses it was Carol's.
    addVote(round, bob, submissions[0], { userGuessId: id(carol) });
    // Carol votes for Alice's song and guesses correctly.
    addVote(round, carol, submissions[0], { userGuessId: id(alice) });
    // Alice votes for Bob's song without guessing.
    addVote(round, alice, submissions[1]);
    setNow(DURING_VOTING);

    const populated = await firstRound(alice);
    const byUser = (userId: string) =>
      populated.submissions.find((s) => s.userId === userId)!;

    const guesses = byUser(id(alice)).guesses?.map((g) => [
      g.guesser.firstName,
      g.guessee.firstName,
    ]);
    expect(guesses).toEqual([
      ['Bob', 'Carol'],
      ['Carol', 'Alice'],
    ]);
    expect(byUser(id(bob)).guesses).toBeNull();

    const bobsVote = populated.votes.find((v) => v.userId === id(bob))!;
    expect(bobsVote.userGuessObject?.firstName).toBe('Carol');
  });

  it("only includes the viewer's own on-deck submissions", async () => {
    const { users, round } = submittedRound();
    const [alice, bob] = users;
    const alicesOnDeck = addOnDeck(round, alice);
    addOnDeck(round, bob);
    setNow(DURING_VOTING);

    const populated = await firstRound(alice);

    expect(populated.onDeckSubmissions.map((s) => s._id)).toEqual([
      id(alicesOnDeck),
    ]);
    expect(populated.onDeckSubmissions[0].userObject?.firstName).toBe('Alice');
  });
});

describe('users', () => {
  it('lists members in league order with their index', async () => {
    const users = addUsers(3);
    addLeague([users[2], users[0], users[1]]);
    setNow(et('2025-06-03T12:00'));

    const league = await loadHomeLeague(users[0]);

    expect(league.users.map((u) => [u.firstName, u.index])).toEqual([
      ['Carol', 0],
      ['Alice', 1],
      ['Bob', 2],
    ]);
    expect(league.users.every((u) => typeof u._id === 'string')).toBe(true);
  });

  it('does not attach round-creation permissions to members', async () => {
    // Those are per-viewer: League.tsx reads league.bonusRoundUserIds /
    // kickoffRoundUserIds directly, and getUser() works them out per user.
    const [alice, bob] = addUsers(2);
    addLeague([alice, bob], { bonusRoundUserIds: [id(alice)] });
    setNow(et('2025-06-03T12:00'));

    const league = await loadHomeLeague(alice);

    for (const user of league.users) {
      expect(user).not.toHaveProperty('canCreateBonusRound');
      expect(user).not.toHaveProperty('canCreateKickoffRound');
    }
  });
});
