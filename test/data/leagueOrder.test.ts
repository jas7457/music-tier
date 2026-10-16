import { beforeEach, describe, expect, it } from 'vitest';
import { getHomeLeagues, getUserLeagues } from '@/lib/data';
import { addLeague, addUsers, et, id, resetDb, setNow } from '../fixtures';

beforeEach(() => {
  resetDb();
  setNow(et('2025-06-03T12:00'));
});

describe('league display order', () => {
  it('only includes leagues the user belongs to', async () => {
    const [alice, bob] = addUsers(2);
    const mine = addLeague([alice, bob], { title: 'Mine' });
    addLeague([bob], { title: 'Not mine' });

    const leagues = await getUserLeagues(id(alice));
    expect(leagues.map((l) => l._id)).toEqual([id(mine)]);
  });

  it('puts started leagues first (latest start first), then upcoming ones, then test leagues', async () => {
    const [alice] = addUsers(1);
    const add = (title: string, start: string) =>
      addLeague([alice], { title, leagueStartDate: et(start) });

    add('Test league', '2025-06-01T00:00');
    add('Started May', '2025-05-01T00:00');
    add('Starts July', '2025-07-01T00:00');
    add('Started June', '2025-06-02T00:00');
    add('Starts August', '2025-08-01T00:00');

    const leagues = await getUserLeagues(id(alice));
    expect(leagues.map((l) => l.title)).toEqual([
      'Started June',
      'Started May',
      // Upcoming leagues are also latest-start first, so the furthest-out
      // league comes before the next one to start.
      'Starts August',
      'Starts July',
      'Test league',
    ]);
  });
});

describe('getHomeLeagues', () => {
  it('returns nothing when the user has no leagues', async () => {
    const [alice] = addUsers(1);
    expect(await getHomeLeagues(id(alice))).toEqual({
      currentLeague: undefined,
      otherLeagues: [],
    });
  });

  it('fully populates the first league and summarises the rest', async () => {
    const [alice, bob, carol] = addUsers(3);
    const current = addLeague([alice, bob, carol], {
      title: 'Current',
      leagueStartDate: et('2025-06-02T00:00'),
    });
    const older = addLeague([alice, bob], {
      title: 'Older',
      leagueStartDate: et('2025-04-01T00:00'),
    });

    const { currentLeague, otherLeagues } = await getHomeLeagues(id(alice));

    expect(currentLeague?._id).toBe(id(current));
    expect(currentLeague?.users).toHaveLength(3);
    expect(currentLeague?.rounds).toBeDefined();

    expect(otherLeagues).toEqual([
      {
        _id: id(older),
        title: 'Older',
        leagueStartDate: et('2025-04-01T00:00'),
        memberCount: 2,
      },
    ]);
  });

  it('normalises summary start dates to the league transition hour', async () => {
    const [alice] = addUsers(1);
    addLeague([alice], { title: 'Current' });
    addLeague([alice], {
      title: 'Later',
      leagueStartDate: et('2025-07-01T15:30'),
      transitionHour: 9,
    });

    const { otherLeagues } = await getHomeLeagues(id(alice));
    expect(otherLeagues[0].leagueStartDate).toBe(et('2025-07-01T09:00'));
  });
});
