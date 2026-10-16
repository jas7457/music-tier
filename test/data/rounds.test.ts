import { beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Round, SongSubmission, User } from '@/databaseTypes';
import {
  HOUR,
  LEAGUE_START,
  addLeague,
  addRound,
  addSubmission,
  addUsers,
  addVote,
  et,
  id,
  playRound,
  playRoundInSlot,
  resetDb,
  setNow,
  slot,
} from '../fixtures';
import { loadHomeLeague, roundsInOrder, titles } from './helpers';
import { GRACE_PERIOD_MS } from '@/lib/utils/time';

const BEFORE_START = et('2025-05-30T12:00');

beforeEach(() => {
  resetDb();
});

/** A league where every member has created their (normal) round. */
function fullLeague(memberCount: number, overrides = {}) {
  const users = addUsers(memberCount);
  const league = addLeague(users, overrides);
  const rounds = users.map((user) => addRound(league, user));
  return { users, league, rounds };
}

const datesOf = (round: {
  submissionStartDate: number;
  submissionEndDate: number;
  votingStartDate: number;
  votingEndDate: number;
}) => ({
  submissionStartDate: round.submissionStartDate,
  submissionEndDate: round.submissionEndDate,
  votingStartDate: round.votingStartDate,
  votingEndDate: round.votingEndDate,
});

describe('round order', () => {
  it('runs kickoff rounds first, then one round per member in member order, then bonus rounds', async () => {
    setNow(BEFORE_START);
    const [alice, bob, carol] = addUsers(3);
    const league = addLeague([alice, bob, carol], {
      kickoffRoundUserIds: [id(carol)],
      bonusRoundUserIds: [id(alice)],
    });
    // Inserted out of order on purpose.
    addRound(league, alice, { isBonusRound: true, title: 'Bonus' });
    addRound(league, carol);
    addRound(league, alice);
    addRound(league, carol, { isKickoffRound: true, title: 'Kickoff' });
    addRound(league, bob);

    const rounds = roundsInOrder(await loadHomeLeague(alice));

    expect(titles(rounds)).toEqual([
      'Kickoff',
      "Alice's round",
      "Bob's round",
      "Carol's round",
      'Bonus',
    ]);
    expect(rounds.map((r) => r.roundIndex)).toEqual([0, 1, 2, 3, 4]);
  });

  it('links each round to the previous and next one', async () => {
    setNow(BEFORE_START);
    const { users } = fullLeague(3);

    const [first, second, third] = roundsInOrder(
      await loadHomeLeague(users[0]),
    );

    expect(first.previousRound).toBeNull();
    expect(first.nextRound?._id).toBe(second._id);
    expect(second.previousRound?._id).toBe(first._id);
    expect(second.nextRound?._id).toBe(third._id);
    expect(third.nextRound).toBeNull();
  });

  it('adds a pending placeholder for members who have not created their round', async () => {
    setNow(BEFORE_START);
    const [alice, bob, carol] = addUsers(3);
    const league = addLeague([alice, bob, carol]);
    addRound(league, alice);

    const rounds = roundsInOrder(await loadHomeLeague(alice));

    expect(titles(rounds)).toEqual([
      "Alice's round",
      '(pending: Bob)',
      '(pending: Carol)',
    ]);
    const pending = rounds[1];
    expect(pending).toMatchObject({
      _id: '',
      isPending: true,
      creatorId: id(bob),
      leagueId: id(league),
      stage: 'upcoming',
      isHidden: false,
      submissions: [],
      votes: [],
    });
    expect(pending.creatorObject.firstName).toBe('Bob');
    // Placeholders still take up their slot in the schedule.
    expect(datesOf(pending)).toEqual(slot(1));
  });

  it('adds pending kickoff and bonus rounds for allowed users who have not created them', async () => {
    setNow(BEFORE_START);
    const [alice, bob] = addUsers(2);
    const league = addLeague([alice, bob], {
      kickoffRoundUserIds: [id(bob)],
      bonusRoundUserIds: [id(alice)],
    });
    addRound(league, alice);
    addRound(league, bob);

    const league_ = await loadHomeLeague(alice);
    const rounds = roundsInOrder(league_);

    expect(rounds).toHaveLength(4);
    expect(rounds[0]).toMatchObject({
      isPending: true,
      isKickoffRound: true,
      creatorId: id(bob),
    });
    expect(rounds[3]).toMatchObject({
      isPending: true,
      isBonusRound: true,
      creatorId: id(alice),
    });
    expect(league_.rounds.kickoff).toHaveLength(1);
    expect(league_.rounds.bonus).toHaveLength(1);
  });

  it('skips members whose user document no longer exists', async () => {
    setNow(BEFORE_START);
    const [alice, bob] = addUsers(2);
    const ghostId = new ObjectId('ffffffffffffffffffffffff').toHexString();
    const league = addLeague([alice, bob]);
    league.users.splice(1, 0, ghostId);
    addRound(league, alice);
    addRound(league, bob);

    const populated = await loadHomeLeague(alice);

    expect(populated.users.map((u) => [u.firstName, u.index])).toEqual([
      ['Alice', 0],
      ['Bob', 1],
    ]);
    expect(titles(roundsInOrder(populated))).toEqual([
      "Alice's round",
      "Bob's round",
    ]);
    expect(populated.numberOfRounds).toBe(2);
  });
});

describe('schedule', () => {
  it('runs rounds back to back in fixed windows', async () => {
    setNow(BEFORE_START);
    const { users } = fullLeague(4);

    const rounds = roundsInOrder(await loadHomeLeague(users[0]));

    expect(rounds.map(datesOf)).toEqual([slot(0), slot(1), slot(2), slot(3)]);
    expect(rounds.every((r) => r.gracePeriod === null)).toBe(true);
  });

  it('snaps the league start to midnight Eastern', async () => {
    setNow(BEFORE_START);
    const { users } = fullLeague(2, {
      leagueStartDate: et('2025-06-02T15:30'),
    });

    const league = await loadHomeLeague(users[0]);

    expect(league.leagueStartDate).toBe(LEAGUE_START);
    expect(roundsInOrder(league)[0].submissionStartDate).toBe(LEAGUE_START);
  });

  it('puts day boundaries on the league transition hour', async () => {
    setNow(BEFORE_START);
    const { users } = fullLeague(2, { transitionHour: 9 });

    const league = await loadHomeLeague(users[0]);
    const nineAm = et('2025-06-02T09:00');

    expect(league.leagueStartDate).toBe(nineAm);
    expect(roundsInOrder(league).map(datesOf)).toEqual([
      slot(0, nineAm),
      slot(1, nineAm),
    ]);
  });

  it('uses custom dates stored on a round as-is', async () => {
    setNow(BEFORE_START);
    const [alice, bob] = addUsers(2);
    const league = addLeague([alice, bob]);
    const custom = {
      submissionStartDate: et('2025-06-02T00:00'),
      submissionEndDate: et('2025-06-03T00:00'),
      votingStartDate: et('2025-06-03T00:00'),
      votingEndDate: et('2025-06-04T00:00'),
    };
    addRound(league, alice, custom);
    addRound(league, bob);

    const [first, second] = roundsInOrder(await loadHomeLeague(alice));

    expect(datesOf(first)).toEqual(custom);
    // The next round picks up where the custom one ended.
    expect(second.submissionStartDate).toBe(et('2025-06-04T00:00'));
  });

  describe('with auto start on (the default)', () => {
    it('opens voting once everyone has submitted, and the next round once everyone has voted', async () => {
      const { users, rounds } = fullLeague(3, { autoStartRounds: undefined });
      playRound(rounds[0], users, {
        submittedAt: et('2025-06-02T11:00'),
        votedAt: et('2025-06-03T10:00'),
      });
      setNow(et('2025-06-03T12:00'));

      const league = await loadHomeLeague(users[0]);
      const [first, second] = roundsInOrder(league);

      expect(datesOf(first)).toEqual({
        submissionStartDate: LEAGUE_START,
        submissionEndDate: et('2025-06-02T11:00'),
        votingStartDate: et('2025-06-02T11:00'),
        votingEndDate: et('2025-06-03T10:00'),
      });
      expect(first.stage).toBe('completed');
      expect(second.submissionStartDate).toBe(et('2025-06-03T10:00'));
      expect(second.submissionEndDate).toBe(et('2025-06-06T23:59:59'));
      expect(league.rounds.current?._id).toBe(second._id);
    });

    it('keeps the full submission window while someone has not submitted', async () => {
      const { users, rounds } = fullLeague(3, { autoStartRounds: undefined });
      addSubmission(rounds[0], users[0]);
      addSubmission(rounds[0], users[1]);
      setNow(et('2025-06-03T12:00'));

      const [first] = roundsInOrder(await loadHomeLeague(users[0]));

      expect(first.submissionEndDate).toBe(slot(0).submissionEndDate);
      expect(first.stage).toBe('submission');
    });
  });

  it('with auto start off, keeps every window full even when everyone finishes early', async () => {
    const { users, rounds } = fullLeague(3, { autoStartRounds: false });
    playRound(rounds[0], users, {
      submittedAt: et('2025-06-02T11:00'),
      votedAt: et('2025-06-05T10:00'),
    });
    setNow(et('2025-06-05T12:00'));

    const league = await loadHomeLeague(users[0]);
    const [first, second] = roundsInOrder(league);

    expect(first.submissionEndDate).toBe(slot(0).submissionEndDate);
    expect(first.votingEndDate).toBe(slot(0).votingEndDate);
    expect(datesOf(second)).toEqual(slot(1));
    expect(league.rounds.current?._id).toBe(first._id);
  });

  describe('grace periods', () => {
    it('gives late submitters extra time, eating into voting time', async () => {
      const { users, rounds } = fullLeague(3);
      const [alice, bob, carol] = users;
      addSubmission(rounds[0], alice);
      addSubmission(rounds[0], bob);
      setNow(slot(0).submissionEndDate + HOUR);

      const league = await loadHomeLeague(alice);
      const [first, second] = roundsInOrder(league);
      const graceEnd = slot(0).submissionEndDate + GRACE_PERIOD_MS;

      expect(first.stage).toBe('submission');
      expect(first.gracePeriod).toMatchObject({
        type: 'submission',
        scheduledEndDate: slot(0).submissionEndDate,
        endDate: graceEnd,
      });
      expect(first.gracePeriod?.missingUsers.map((u) => u._id)).toEqual([
        id(carol),
      ]);
      expect(first.submissionEndDate).toBe(graceEnd);
      expect(first.votingStartDate).toBe(graceEnd);
      // Voting is still due at the normal time.
      expect(first.votingEndDate).toBe(slot(0).votingEndDate);
      expect(datesOf(second)).toEqual(slot(1));
    });

    it('gives late voters extra time and holds the next round shut without moving its deadlines', async () => {
      const { users, rounds } = fullLeague(3);
      const [alice, bob, carol] = users;
      const submissions = users.map((u) =>
        addSubmission(rounds[0], u, { submissionDate: LEAGUE_START + HOUR }),
      );
      addVote(rounds[0], alice, submissions[1]);
      addVote(rounds[0], bob, submissions[2]);
      setNow(slot(0).votingEndDate + 2 * HOUR);

      const league = await loadHomeLeague(carol);
      const [first, second] = roundsInOrder(league);
      const graceEnd = slot(0).votingEndDate + GRACE_PERIOD_MS;

      expect(league.rounds.current?._id).toBe(first._id);
      expect(first.stage).toBe('voting');
      expect(first.gracePeriod).toMatchObject({
        type: 'voting',
        scheduledEndDate: slot(0).votingEndDate,
        endDate: graceEnd,
      });
      expect(first.gracePeriod?.missingUsers.map((u) => u._id)).toEqual([
        id(carol),
      ]);
      expect(first.votingEndDate).toBe(graceEnd);

      expect(second.stage).toBe('upcoming');
      expect(second.submissionStartDate).toBe(graceEnd);
      expect(second.submissionEndDate).toBe(slot(1).submissionEndDate);
      expect(second.votingEndDate).toBe(slot(1).votingEndDate);
    });

    it('closes the round for good once the grace period runs out', async () => {
      const { users, rounds } = fullLeague(3);
      const [alice, bob] = users;
      const submissions = users.map((u) =>
        addSubmission(rounds[0], u, { submissionDate: LEAGUE_START + HOUR }),
      );
      addVote(rounds[0], alice, submissions[1]);
      addVote(rounds[0], bob, submissions[2]);
      setNow(et('2025-06-08T12:00'));

      const league = await loadHomeLeague(alice);
      const [first, second] = roundsInOrder(league);
      const graceEnd = slot(0).votingEndDate + GRACE_PERIOD_MS;

      expect(first.stage).toBe('completed');
      expect(first.gracePeriod).toBeNull();
      expect(first.votingEndDate).toBe(graceEnd);
      expect(second.submissionStartDate).toBe(graceEnd);
      expect(league.rounds.current?._id).toBe(second._id);
    });

    it('skips voting when nobody submitted, and starts the next round early', async () => {
      const { users } = fullLeague(3);
      const graceEnd = slot(0).submissionEndDate + GRACE_PERIOD_MS;
      setNow(graceEnd + HOUR);

      const league = await loadHomeLeague(users[0]);
      const [first, second] = roundsInOrder(league);

      expect(first.stage).toBe('completed');
      expect(first.votingStartDate).toBe(graceEnd);
      expect(first.votingEndDate).toBe(graceEnd);
      // The skipped voting days are given back to the schedule.
      expect(second.submissionStartDate).toBe(et('2025-06-05T00:00'));
      expect(league.rounds.current?._id).toBe(second._id);
    });
  });
});

describe('stage', () => {
  async function stageAt(
    time: number,
    addVotes: (
      round: Round,
      users: User[],
      submissions: SongSubmission[],
    ) => void = () => {},
  ) {
    resetDb();
    const { users, rounds } = fullLeague(3);
    const submissions = users.map((u) =>
      addSubmission(rounds[0], u, { submissionDate: LEAGUE_START + HOUR }),
    );
    addVotes(rounds[0], users, submissions);
    setNow(time);
    const [first] = roundsInOrder(await loadHomeLeague(users[0]));
    return first.stage;
  }

  it('is upcoming before submissions open', async () => {
    expect(await stageAt(BEFORE_START)).toBe('upcoming');
  });

  it('is submission while submissions are open', async () => {
    expect(await stageAt(et('2025-06-03T12:00'))).toBe('submission');
  });

  it('is voting while voting is open and the viewer still has points to give', async () => {
    const duringVoting = et('2025-06-05T12:00');
    expect(await stageAt(duringVoting)).toBe('voting');
    expect(
      await stageAt(duringVoting, (round, [alice], subs) => {
        addVote(round, alice, subs[1], { points: 2 });
      }),
    ).toBe('voting');
  });

  it('is currentUserVotingCompleted once the viewer has given all their points', async () => {
    expect(
      await stageAt(et('2025-06-05T12:00'), (round, [alice], subs) => {
        addVote(round, alice, subs[1], { points: 2 });
        addVote(round, alice, subs[2], { points: 1 });
      }),
    ).toBe('currentUserVotingCompleted');
  });

  it('is completed once voting has ended', async () => {
    expect(await stageAt(et('2025-06-10T12:00'))).toBe('completed');
  });
});

describe('round buckets', () => {
  it('splits rounds into current, completed (newest first) and upcoming', async () => {
    const { users, rounds } = fullLeague(4);
    playRoundInSlot(rounds[0], users, 0);
    playRoundInSlot(rounds[1], users, 1);
    setNow(et('2025-06-13T12:00'));

    const league = await loadHomeLeague(users[0]);

    expect(league.status).toBe('active');
    expect(league.rounds.current?.title).toBe("Carol's round");
    expect(titles(league.rounds.completed)).toEqual([
      "Bob's round",
      "Alice's round",
    ]);
    expect(titles(league.rounds.upcoming)).toEqual(["Dave's round"]);
    expect(league.rounds.kickoff).toEqual([]);
    expect(league.rounds.bonus).toEqual([]);
  });

  it('keeps kickoff and bonus rounds in their own buckets until they are current or completed', async () => {
    const [alice, bob, carol] = addUsers(3);
    const league = addLeague([alice, bob, carol], {
      kickoffRoundUserIds: [id(carol)],
      bonusRoundUserIds: [id(alice)],
    });
    const kickoff = addRound(league, carol, {
      isKickoffRound: true,
      title: 'Kickoff',
    });
    [alice, bob, carol].forEach((u) => addRound(league, u));
    addRound(league, alice, { isBonusRound: true, title: 'Bonus' });
    playRoundInSlot(kickoff, [alice, bob, carol], 0);

    setNow(BEFORE_START);
    let populated = await loadHomeLeague(alice);
    expect(titles(populated.rounds.kickoff)).toEqual(['Kickoff']);
    expect(titles(populated.rounds.bonus)).toEqual(['Bonus']);
    expect(populated.rounds.current).toBeUndefined();

    setNow(et('2025-06-03T12:00'));
    populated = await loadHomeLeague(alice);
    expect(populated.rounds.current?.title).toBe('Kickoff');
    expect(populated.rounds.kickoff).toEqual([]);

    setNow(et('2025-06-08T12:00'));
    populated = await loadHomeLeague(alice);
    expect(populated.rounds.current?.title).toBe("Alice's round");
    expect(titles(populated.rounds.completed)).toEqual(['Kickoff']);
    expect(titles(populated.rounds.bonus)).toEqual(['Bonus']);
  });

  it('lists a pending round under upcoming once its window has started', async () => {
    // Nobody has created a round yet, so Alice's (first) round is a
    // placeholder. It can't be the current round (there's nothing to submit
    // to), but it must not drop out of the list either.
    const [alice, bob] = addUsers(2);
    addLeague([alice, bob]);
    setNow(et('2025-06-03T12:00'));

    const league = await loadHomeLeague(alice);

    expect(league.rounds.current).toBeUndefined();
    expect(titles(league.rounds.upcoming)).toEqual([
      '(pending: Alice)',
      '(pending: Bob)',
    ]);
    expect(league.rounds.upcoming[0]).toMatchObject({
      isPending: true,
      stage: 'submission',
      isHidden: false,
    });
    expect(league.status).toBe('active');
  });
});

describe('hidden upcoming rounds', () => {
  async function visibility(viewerIndex: number, overrides = {}) {
    resetDb();
    const { users, rounds } = fullLeague(4, overrides);
    playRoundInSlot(rounds[0], users, 0);
    setNow(et('2025-06-08T12:00'));
    const league = await loadHomeLeague(users[viewerIndex]);
    return roundsInOrder(league).map((r) => [r.title, r.isHidden]);
  }

  it('hides other people’s upcoming rounds by default', async () => {
    expect(await visibility(0)).toEqual([
      ["Alice's round", false], // completed
      ["Bob's round", false], // current
      ["Carol's round", true],
      ["Dave's round", true],
    ]);
  });

  it('never hides your own round', async () => {
    expect(await visibility(3)).toEqual([
      ["Alice's round", false],
      ["Bob's round", false],
      ["Carol's round", true],
      ["Dave's round", false],
    ]);
  });

  it('reveals that many upcoming rounds beyond the current one with upcomingRoundsToShow', async () => {
    expect(await visibility(0, { upcomingRoundsToShow: 1 })).toEqual([
      ["Alice's round", false],
      ["Bob's round", false], // current
      ["Carol's round", false],
      ["Dave's round", true],
    ]);
    expect(await visibility(0, { upcomingRoundsToShow: 2 })).toEqual([
      ["Alice's round", false],
      ["Bob's round", false],
      ["Carol's round", false],
      ["Dave's round", false],
    ]);
  });

  it('counts from the first round before the league starts', async () => {
    const { users } = fullLeague(3, { upcomingRoundsToShow: 1 });
    setNow(BEFORE_START);

    const rounds = roundsInOrder(await loadHomeLeague(users[2]));

    expect(rounds.map((r) => [r.title, r.isHidden])).toEqual([
      ["Alice's round", false],
      ["Bob's round", true],
      ["Carol's round", false], // the viewer's own
    ]);
  });

  it('never hides the current round, whatever the setting', async () => {
    const { users } = fullLeague(3, { upcomingRoundsToShow: 0 });
    setNow(et('2025-06-03T12:00'));

    const league = await loadHomeLeague(users[2]);

    expect(league.rounds.current?.title).toBe("Alice's round");
    expect(league.rounds.current?.isHidden).toBe(false);
  });

  it('never hides pending placeholders', async () => {
    const [alice, bob, carol] = addUsers(3);
    const league = addLeague([alice, bob, carol]);
    addRound(league, alice);
    setNow(BEFORE_START);

    const rounds = roundsInOrder(await loadHomeLeague(bob));

    expect(rounds.map((r) => [titles([r])[0], r.isHidden])).toEqual([
      ["Alice's round", true],
      ['(pending: Bob)', false],
      ['(pending: Carol)', false],
    ]);
  });

  it('passes hidden state through to previous/next round links', async () => {
    const { users, rounds } = fullLeague(3);
    playRoundInSlot(rounds[0], users, 0);
    setNow(et('2025-06-08T12:00'));

    const [, current] = roundsInOrder(await loadHomeLeague(users[0]));

    expect(current.previousRound?.isHidden).toBe(false);
    expect(current.nextRound?.isHidden).toBe(true);
  });
});

describe('league status', () => {
  it('is upcoming before the league starts', async () => {
    const { users } = fullLeague(2);
    setNow(BEFORE_START);
    const league = await loadHomeLeague(users[0]);
    expect(league.status).toBe('upcoming');
    expect(league.playback).toBeNull();
  });

  it('is active while a round is running', async () => {
    const { users } = fullLeague(2);
    setNow(et('2025-06-03T12:00'));
    const league = await loadHomeLeague(users[0]);
    expect(league.status).toBe('active');
    expect(league.playback).toBeNull();
  });

  it('is completed, with playback stats, once every round is done', async () => {
    const { users, rounds } = fullLeague(2);
    playRoundInSlot(rounds[0], users, 0);
    playRoundInSlot(rounds[1], users, 1);
    setNow(et('2025-06-20T12:00'));

    const league = await loadHomeLeague(users[0]);

    expect(league.status).toBe('completed');
    expect(league.numberOfRounds).toBe(2);
    expect(league.rounds.completed).toHaveLength(2);
    expect(league.playback).not.toBeNull();
  });
});
