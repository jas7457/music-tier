import { beforeEach, describe, expect, it } from 'vitest';
import {
  getLeagueById,
  getLeagueByRoundId,
  getUser,
  getUserLeagues,
} from '@/lib/data';
import {
  addLeague,
  addRound,
  addUsers,
  et,
  id,
  nextId,
  playRound,
  playRoundInSlot,
  resetDb,
  setNow,
} from '../fixtures';

beforeEach(() => {
  resetDb();
  setNow(et('2025-06-03T12:00'));
});

describe('getUserLeagues', () => {
  it('fully populates every league the user is in', async () => {
    const [alice, bob] = addUsers(2);
    addLeague([alice, bob], { title: 'One' });
    addLeague([alice], {
      title: 'Two',
      leagueStartDate: et('2025-05-01T00:00'),
    });

    const leagues = await getUserLeagues(id(alice));

    expect(leagues.map((l) => l.title)).toEqual(['One', 'Two']);
    for (const league of leagues) {
      expect(league.rounds).toBeDefined();
      expect(league.status).toBeDefined();
    }
  });
});

describe('getLeagueById', () => {
  it('returns the league by id', async () => {
    const [alice] = addUsers(1);
    addLeague([alice], { title: 'First' });
    const second = addLeague([alice], {
      title: 'Second',
      leagueStartDate: et('2025-05-01T00:00'),
    });

    const league = await getLeagueById(id(second), id(alice));
    expect(league?.title).toBe('Second');
  });

  it("returns undefined for a league the user isn't in", async () => {
    const [alice, bob] = addUsers(2);
    const bobsLeague = addLeague([bob]);
    expect(await getLeagueById(id(bobsLeague), id(alice))).toBeUndefined();
  });

  it('returns undefined for an unknown league', async () => {
    const [alice] = addUsers(1);
    addLeague([alice]);
    expect(
      await getLeagueById(nextId().toHexString(), id(alice)),
    ).toBeUndefined();
  });

  describe("'current'", () => {
    it('returns undefined when the user has no leagues', async () => {
      const [alice] = addUsers(1);
      expect(await getLeagueById('current', id(alice))).toBeUndefined();
    });

    it('returns the active league even when it is not first in display order', async () => {
      const users = addUsers(3);
      // Started 25 May: round 1 is done and round 2 is running on 3 June.
      const active = addLeague(users, {
        title: 'Active',
        leagueStartDate: et('2025-05-25T00:00'),
      });
      const rounds = users.map((u) => addRound(active, u));
      playRoundInSlot(rounds[0], users, 0, et('2025-05-25T00:00'));
      // Started more recently (so listed first), but already finished.
      const finished = addLeague([users[0]], {
        title: 'Finished',
        leagueStartDate: et('2025-06-01T00:00'),
        autoStartRounds: true,
      });
      playRound(addRound(finished, users[0]), [users[0]], {
        submittedAt: et('2025-06-01T10:00'),
        votedAt: et('2025-06-01T11:00'),
      });

      const league = await getLeagueById('current', id(users[0]));
      expect(league?.title).toBe('Active');
      expect(league?.status).toBe('active');
    });

    it('falls back to the league starting closest to now', async () => {
      const [alice] = addUsers(1);
      addLeague([alice], {
        title: 'August',
        leagueStartDate: et('2025-08-01T00:00'),
      });
      addLeague([alice], {
        title: 'July',
        leagueStartDate: et('2025-07-01T00:00'),
      });

      const league = await getLeagueById('current', id(alice));
      expect(league?.title).toBe('July');
    });
  });
});

describe('getLeagueByRoundId', () => {
  it('returns the league and the populated round', async () => {
    const [alice, bob] = addUsers(2);
    const league = addLeague([alice, bob]);
    addRound(league, alice);
    const bobsRound = addRound(league, bob);

    const result = await getLeagueByRoundId(id(bobsRound), id(alice));

    expect(result?.league._id).toBe(id(league));
    expect(result?.round._id).toBe(id(bobsRound));
    expect(result?.round.title).toBe("Bob's round");
  });

  it('returns null for an invalid round id', async () => {
    const [alice] = addUsers(1);
    expect(await getLeagueByRoundId('not-an-id', id(alice))).toBeNull();
  });

  it('returns null for an unknown round', async () => {
    const [alice] = addUsers(1);
    addLeague([alice]);
    expect(
      await getLeagueByRoundId(nextId().toHexString(), id(alice)),
    ).toBeNull();
  });

  it("returns null for a round in a league the user isn't in", async () => {
    const [alice, bob] = addUsers(2);
    const league = addLeague([bob]);
    const round = addRound(league, bob);
    expect(await getLeagueByRoundId(id(round), id(alice))).toBeNull();
  });
});

describe('getUser', () => {
  it('returns null for an unknown user', async () => {
    expect(await getUser(nextId().toHexString(), 'any')).toBeNull();
  });

  it("returns the user without round permissions for 'any' league", async () => {
    const [alice] = addUsers(1);
    expect(await getUser(id(alice), 'any')).toMatchObject({
      firstName: 'Alice',
      canCreateBonusRound: false,
      canCreateKickoffRound: false,
    });
  });

  it("reports the user's kickoff and bonus permissions for a league", async () => {
    const [alice, bob] = addUsers(2);
    const league = addLeague([alice, bob], {
      kickoffRoundUserIds: [id(alice)],
      bonusRoundUserIds: [id(bob)],
    });

    expect(await getUser(id(alice), id(league))).toMatchObject({
      canCreateKickoffRound: true,
      canCreateBonusRound: false,
    });
    expect(await getUser(id(bob), id(league))).toMatchObject({
      canCreateKickoffRound: false,
      canCreateBonusRound: true,
    });
  });

  it("returns null for a league the user isn't in", async () => {
    const [alice, bob] = addUsers(2);
    const league = addLeague([bob]);
    expect(await getUser(id(alice), id(league))).toBeNull();
  });
});
