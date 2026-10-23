import { describe, expect, it } from 'vitest';
import type {
  PopulatedLeague,
  PopulatedRound,
  PopulatedSubmission,
  PopulatedUser,
  PopulatedVote,
} from '@/lib/types';
import { buildVenueModel, getStandings } from './venueModel';

function user(index: number, name: string): PopulatedUser {
  return {
    _id: `u${index}`,
    index,
    firstName: name,
    lastName: 'Test',
    userName: name.toLowerCase(),
    signupDate: 0,
  };
}

const alice = user(0, 'Alice');
const bob = user(1, 'Bob');
const cara = user(2, 'Cara');
const users = [alice, bob, cara];

function submission(id: string, by: PopulatedUser, roundId: string): PopulatedSubmission {
  return {
    _id: id,
    roundId,
    userId: by._id,
    userObject: by,
    guesses: null,
    submissionDate: 0,
    trackInfo: {
      trackId: `t-${id}`,
      title: `Song ${id}`,
      artists: ['Artist'],
      albumName: 'Album',
      albumImageUrl: `https://img/${id}.jpg`,
    },
  };
}

function vote(by: PopulatedUser, submissionId: string, points: number, roundId: string): PopulatedVote {
  return {
    _id: `${by._id}-${submissionId}`,
    userId: by._id,
    userObject: by,
    userGuessObject: undefined,
    submissionId,
    roundId,
    points,
    voteDate: 0,
  };
}

function round(
  id: string,
  stage: PopulatedRound['stage'],
  creator: PopulatedUser,
  extra: Partial<PopulatedRound> = {},
): PopulatedRound {
  return {
    _id: id,
    leagueId: 'L',
    title: `Round ${id}`,
    description: '',
    creatorId: creator._id,
    creatorObject: creator,
    isBonusRound: false,
    isKickoffRound: false,
    submissionDate: 0,
    lastUpdatedDate: 0,
    roundIndex: 0,
    submissionStartDate: 0,
    submissionEndDate: 0,
    votingStartDate: 0,
    votingEndDate: 0,
    stage,
    gracePeriod: null,
    votes: [],
    submissions: [],
    onDeckSubmissions: [],
    userSubmission: undefined,
    isHidden: false,
    previousRound: null,
    nextRound: null,
    ...extra,
  };
}

function league(rounds: Partial<PopulatedLeague['rounds']>): PopulatedLeague {
  return {
    _id: 'L',
    title: 'League',
    description: '',
    votesPerRound: 3,
    users,
    leagueStartDate: 0,
    daysForSubmission: 3,
    daysForVoting: 3,
    kickoffRoundUserIds: [],
    bonusRoundUserIds: [],
    status: 'active',
    numberOfRounds: 3,
    playback: null,
    rounds: {
      current: undefined,
      completed: [],
      upcoming: [],
      bonus: [],
      kickoff: [],
      ...rounds,
    },
  };
}

// Everyone has written a round, so "write your round" never takes priority.
const written = [alice, bob, cara].map((creator, i) =>
  round(`w${i}`, 'upcoming', creator),
);

describe('buildVenueModel', () => {
  it('asks you to write your round first', () => {
    const model = buildVenueModel(league({}), alice);
    expect(model.quest).toMatchObject({ station: 'stage', urgent: true });
  });

  it('sends you to the DJ booth when you still owe a song', () => {
    const current = round('r1', 'submission', bob, {
      submissions: [submission('s1', bob, 'r1')],
    });
    const model = buildVenueModel(
      league({ current, upcoming: written }),
      alice,
    );
    expect(model.quest).toMatchObject({ station: 'booth', urgent: true });
    const states = Object.fromEntries(
      model.friends.map((f) => [f.user._id, f.isDone]),
    );
    expect(states).toEqual({ u0: false, u1: true, u2: false });
  });

  it('sends you to the ballot box while voting, and marks who has voted', () => {
    const subs = [submission('s1', alice, 'r1'), submission('s2', bob, 'r1')];
    const current = round('r1', 'voting', bob, {
      submissions: subs,
      // Bob spent all 3 of his points; Cara only 1 so far
      votes: [vote(bob, 's1', 3, 'r1'), vote(cara, 's1', 1, 'r1')],
    });
    const model = buildVenueModel(
      league({ current, upcoming: written }),
      alice,
    );
    expect(model.quest).toMatchObject({ station: 'ballot', urgent: true });
    const done = model.friends.filter((f) => f.isDone).map((f) => f.user._id);
    expect(done).toEqual(['u1']);
  });
});

describe('getStandings', () => {
  it('totals points across completed rounds and counts wins', () => {
    const r1 = round('r1', 'completed', alice, {
      submissions: [submission('a', alice, 'r1'), submission('b', bob, 'r1')],
      votes: [vote(cara, 'a', 2, 'r1'), vote(cara, 'b', 1, 'r1')],
    });
    const r2 = round('r2', 'completed', bob, {
      submissions: [submission('c', alice, 'r2'), submission('d', bob, 'r2')],
      votes: [vote(cara, 'c', 1, 'r2'), vote(cara, 'd', 3, 'r2')],
    });
    const standings = getStandings(league({ completed: [r1, r2] }));
    expect(
      standings.map((s) => [s.user.firstName, s.points, s.wins, s.place]),
    ).toEqual([
      ['Bob', 4, 1, 1],
      ['Alice', 3, 1, 2],
      ['Cara', 0, 0, 3],
    ]);
  });
});

describe('quest priority', () => {
  it('puts an open ballot ahead of writing your round', () => {
    const current = round('r1', 'voting', bob, {
      submissions: [submission('s1', bob, 'r1')],
    });
    // nobody has written a round for alice
    const model = buildVenueModel(league({ current }), alice);
    expect(model.quest).toMatchObject({ station: 'ballot' });
  });

  it('puts an owed song ahead of writing your round', () => {
    const current = round('r1', 'submission', bob);
    const model = buildVenueModel(league({ current }), alice);
    expect(model.quest).toMatchObject({ station: 'booth' });
  });

  it('asks you to write your round once nothing is due', () => {
    const current = round('r1', 'currentUserVotingCompleted', bob);
    const model = buildVenueModel(league({ current }), alice);
    expect(model.quest).toMatchObject({ station: 'stage', title: 'Write your round' });
  });
});
