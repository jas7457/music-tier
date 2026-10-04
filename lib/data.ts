import { getCollection } from '@/lib/mongodb';
import {
  League,
  OnDeckSongSubmission,
  Round,
  SongSubmission,
  User,
  Vote,
} from '@/databaseTypes';
import { ObjectId } from 'mongodb';
import { ONE_DAY_MS } from './utils/time';
import {
  PopulatedGracePeriod,
  PopulatedLeague,
  PopulatedOnDeckSubmission,
  PopulatedRound,
  PopulatedRoundStage,
  PopulatedSubmission,
  PopulatedUser,
  PopulatedVote,
} from './types';
import { verifySessionToken } from './auth';
import { seededShuffle } from './utils/seededShuffle';
import { UPCOMING_ROUNDS_TO_SHOW } from './utils/constants';
import { assertNever } from './utils/never';
import { getAllRounds } from './utils/getAllRounds';
import { calculatePlaybackStats } from './playbackCalculations';
import { getRoundSchedule, getStartOfDayAtHour } from './utils/roundSchedule';

const dbPromise = (async () => {
  const [
    usersCollection,
    leaguesCollection,
    roundsCollection,
    submissionsCollection,
    onDeckSubmissionsCollection,
    votesCollection,
  ] = await Promise.all([
    getCollection<User>('users'),
    getCollection<League>('leagues'),
    getCollection<Round>('rounds'),
    getCollection<SongSubmission>('songSubmissions'),
    getCollection<OnDeckSongSubmission>('onDeckSongSubmissions'),
    getCollection<Vote>('votes'),
  ]);
  return {
    usersCollection,
    leaguesCollection,
    roundsCollection,
    submissionsCollection,
    onDeckSubmissionsCollection,
    votesCollection,
  };
})();

type RawLeague = Omit<League, '_id'> & { _id: string };

/**
 * The user's league documents (not populated), in display order: started
 * leagues newest first, then upcoming ones, with test leagues last. Cheap — a
 * single query — so callers can decide which leagues to populate.
 */
async function getRawUserLeagues(userId: string): Promise<RawLeague[]> {
  const { leaguesCollection } = await dbPromise;
  const now = Date.now();
  return (
    await leaguesCollection
      .find({
        // find leagues where userId is in the users array
        users: userId,
      })
      .sort({ _id: -1 }) // Sort by newest first
      .toArray()
  )
    .map((league) => {
      return { ...league, _id: league._id.toString() };
    })
    .sort((leagueA, leagueB) => {
      if (leagueA.title === 'Test league') {
        return 1;
      }
      if (leagueB.title === 'Test league') {
        return -1;
      }
      const leagueAHasStarted = now >= leagueA.leagueStartDate;
      const leagueBHasStarted = now >= leagueB.leagueStartDate;
      if (leagueAHasStarted && !leagueBHasStarted) {
        return -1;
      }
      if (!leagueAHasStarted && leagueBHasStarted) {
        return 1;
      }
      return leagueB.leagueStartDate - leagueA.leagueStartDate;
    });
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/**
 * Populates leagues with their users, rounds, submissions and votes. All the
 * data is fetched up front in a handful of batched queries (rather than a few
 * queries per round), then each league is assembled in memory.
 */
async function populateLeagues(
  leagues: RawLeague[],
  userId: string,
): Promise<PopulatedLeague[]> {
  if (leagues.length === 0) {
    return [];
  }

  const {
    usersCollection,
    roundsCollection,
    submissionsCollection,
    onDeckSubmissionsCollection,
    votesCollection,
  } = await dbPromise;

  // get the current timestamp in the east coast of the usa
  const now = Date.now();

  const leagueIds = leagues.map((league) => league._id);
  const memberIds = Array.from(
    new Set(leagues.flatMap((league) => league.users)),
  );
  const [allRoundDocs, allUserDocs] = await Promise.all([
    roundsCollection.find({ leagueId: { $in: leagueIds } }).toArray(),
    usersCollection
      .find({ _id: { $in: memberIds.map((id) => new ObjectId(id)) } })
      .toArray(),
  ]);

  const roundIds = allRoundDocs.map((round) => round._id.toString());
  const [allSubmissions, allOnDeckSubmissions, allVotes] = await Promise.all([
    submissionsCollection.find({ roundId: { $in: roundIds } }).toArray(),
    onDeckSubmissionsCollection
      .find({ roundId: { $in: roundIds }, userId })
      .toArray(),
    votesCollection.find({ roundId: { $in: roundIds } }).toArray(),
  ]);

  // Grouping keeps each group in the order MongoDB returned it (storage order,
  // also the order of an index's entries for a given key), which is the same
  // order the old per-round queries produced.
  const roundDocsByLeague = groupBy(allRoundDocs, (round) => round.leagueId);
  const submissionsByRound = groupBy(
    allSubmissions,
    (submission) => submission.roundId,
  );
  const onDeckSubmissionsByRound = groupBy(
    allOnDeckSubmissions,
    (submission) => submission.roundId,
  );
  const votesByRound = groupBy(allVotes, (vote) => vote.roundId);
  const userDocsById = new Map(
    allUserDocs.map((user) => [user._id.toString(), user]),
  );

  return leagues.map((league) => {
    // Normalize league start date to the configured day-boundary hour
    // (midnight by default) in America/New_York timezone.
    const transitionHour = league.transitionHour ?? 0;
    const reformattedDate = getStartOfDayAtHour(
      league.leagueStartDate,
      transitionHour,
    );

    league.leagueStartDate = reformattedDate;

    // Rounds run back to back: each round's voting end feeds the next
    // round's submission start. This cascade always follows the *scheduled*
    // timeline so that one round's grace period never pushes out any later
    // round's deadlines.
    let currentStartDate = league.leagueStartDate;
    // A round that is still finishing up on grace time blocks the next round
    // from opening, without moving that round's own deadlines.
    let blockedUntil = 0;

    const _rounds = roundDocsByLeague.get(league._id) ?? [];
    const rounds = _rounds.map((round) => ({
      ...round,
      _id: round._id.toString(),
    }));
    const users: PopulatedUser[] = league.users
      .map((userId) => userDocsById.get(userId))
      .filter((user) => user !== undefined)
      .map((user, index) => ({
        ...user,
        _id: user._id.toString(),
        index,
        canCreateBonusRound: league.bonusRoundUserIds.includes(userId),
        canCreateKickoffRound: league.kickoffRoundUserIds.includes(userId),
      }));

    const usersById = users.reduce(
      (acc, user, index) => {
        const userIndex = league.users.indexOf(user._id);
        acc[user._id.toString()] = {
          user,
          index: userIndex === -1 ? index : userIndex,
        };
        return acc;
      },
      {} as Record<string, { user: PopulatedUser; index: number }>,
    );

    const populatedRounds = rounds.map((round) => {
      const _submissions = submissionsByRound.get(round._id) ?? [];
      const _onDeckSubmissions = onDeckSubmissionsByRound.get(round._id) ?? [];
      const _votes = votesByRound.get(round._id) ?? [];

      const votes: PopulatedVote[] = _votes.map((vote) => ({
        ...vote,
        _id: vote._id.toString(),
        userObject: usersById[vote.userId]?.user,
        userGuessObject: vote.userGuessId
          ? usersById[vote.userGuessId]?.user
          : undefined,
      }));

      const submissions: PopulatedSubmission[] = _submissions.map(
        (submission) => {
          const submissionId = submission._id.toString();
          const guesses = votes
            .filter(
              (vote) => vote.submissionId === submissionId && vote.userGuessId,
            )
            .map((vote) => ({
              guesser: vote.userObject,
              guessee: vote.userGuessObject!,
            }));

          return {
            ...submission,
            _id: submissionId,
            userObject: usersById[submission.userId]?.user,
            guesses: guesses.length > 0 ? guesses : null,
          };
        },
      );

      const onDeckSubmissions: PopulatedOnDeckSubmission[] =
        _onDeckSubmissions.map((submission) => ({
          ...submission,
          _id: submission._id.toString(),
          userObject: usersById[submission.userId]?.user,
        }));

      return {
        ...round,
        _id: round._id.toString(),
        submissions,
        onDeckSubmissions,
        votes,
      };
    });

    const createPendingRound = ({
      roundIndex,
      userId,
      isBonusRound,
      isKickoffRound,
    }: {
      roundIndex: number;
      userId: string;
      isBonusRound: boolean;
      isKickoffRound: boolean;
    }): Omit<
      PopulatedRound,
      | 'isHidden'
      | 'gracePeriod'
      | 'submissionStartDate'
      | 'submissionEndDate'
      | 'votingStartDate'
      | 'votingEndDate'
      | 'previousRound'
      | 'nextRound'
    > => {
      const inAWeek = now + 7 * ONE_DAY_MS;

      return {
        _id: '',
        isPending: true,
        leagueId: league._id.toString(),
        creatorId: userId,
        title: '',
        description: '',
        submissions: [],
        onDeckSubmissions: [],
        votes: [],
        roundIndex,
        creatorObject: usersById[userId]?.user,
        stage: 'upcoming' as const,
        userSubmission: undefined,
        isBonusRound,
        isKickoffRound,
        submissionDate: inAWeek,
        lastUpdatedDate: inAWeek,
      };
    };

    const normalUserRounds: Array<
      (typeof populatedRounds)[number] & { roundIndex: number }
    > = league.users
      .map((userId, index) => {
        const user = usersById[userId]?.user;
        if (!user) {
          return undefined;
        }
        const populatedRound = populatedRounds.find(
          (round) =>
            round.creatorId === userId &&
            !round.isBonusRound &&
            !round.isKickoffRound,
        );
        if (populatedRound) {
          return { ...populatedRound, roundIndex: index };
        } else {
          return createPendingRound({
            roundIndex: usersById[userId]?.index ?? index,
            userId,
            isBonusRound: false,
            isKickoffRound: false,
          });
        }
      })
      .filter((round) => round !== undefined)
      .map((round, index) => ({ ...round, roundIndex: index }));

    const getAbnormalRounds = (
      userIds: string[],
      roundType: 'bonus' | 'kickoff',
    ): Array<(typeof populatedRounds)[number]> => {
      return userIds
        .map((userId, userIndex) => {
          const user = usersById[userId]?.user;
          if (!user) {
            return undefined;
          }
          const populatedRound = populatedRounds.find((round) => {
            if (round.creatorId === userId) {
              if (roundType === 'bonus' && round.isBonusRound) {
                return true;
              }
              if (roundType === 'kickoff' && round.isKickoffRound) {
                return true;
              }
            }

            return false;
          });
          if (populatedRound) {
            return populatedRound;
          }
          return createPendingRound({
            roundIndex: league.users.length + userIndex,
            userId,
            isBonusRound: roundType === 'bonus',
            isKickoffRound: roundType === 'kickoff',
          });
        })
        .filter((round) => round !== undefined);
    };

    const kickoffRounds = getAbnormalRounds(
      league.kickoffRoundUserIds,
      'kickoff',
    );
    const bonusRounds = getAbnormalRounds(league.bonusRoundUserIds, 'bonus');

    const upcomingRoundsToShow =
      league.upcomingRoundsToShow ?? UPCOMING_ROUNDS_TO_SHOW;

    let currentOrUpcomingRoundsCount = 0;
    const roundsWithMostData: Array<
      Omit<PopulatedRound, 'previousRound' | 'nextRound'>
    > = [...kickoffRounds, ...normalUserRounds, ...bonusRounds].map(
      (round, roundIndex) => {
        const userSubmission = round.submissions.find(
          (submission) => submission.userId === userId,
        );

        const {
          submissionStartDate,
          submissionEndDate,
          votingStartDate,
          votingEndDate,
          gracePeriod: roundGracePeriod,
          nextScheduledStartDate,
          nextBlockedUntil,
        } = getRoundSchedule({
          round,
          league,
          scheduledStartDate: currentStartDate,
          blockedUntil,
          now,
        });
        currentStartDate = nextScheduledStartDate;
        blockedUntil = nextBlockedUntil;

        const gracePeriod: PopulatedGracePeriod | null = roundGracePeriod
          ? {
              type: roundGracePeriod.type,
              scheduledEndDate: roundGracePeriod.scheduledEndDate,
              endDate: roundGracePeriod.endDate,
              missingUsers: roundGracePeriod.missingUserIds
                .map((missingUserId) => usersById[missingUserId]?.user)
                .filter((user) => user !== undefined),
            }
          : null;

        const populatedRound: Omit<
          PopulatedRound,
          'stage' | 'isHidden' | 'previousRound' | 'nextRound'
        > = {
          ...round,
          _id: round._id.toString(),
          userSubmission,
          submissionStartDate,
          submissionEndDate,
          votingStartDate,
          votingEndDate,
          gracePeriod,
          creatorObject: usersById[round.creatorId]?.user,
          roundIndex,
        };

        const roundStage = getRoundStage({
          currentUserId: userId,
          league,
          round: populatedRound,
          now,
        });

        if (roundStage !== 'completed') {
          currentOrUpcomingRoundsCount += 1;
        }

        const isHidden = (() => {
          if (round.creatorId === userId) {
            return false;
          }
          switch (roundStage) {
            case 'completed':
            case 'submission':
            case 'unknown':
            case 'voting':
            case 'currentUserVotingCompleted': {
              return false;
            }
            case 'upcoming': {
              if (populatedRound.isPending) {
                return false;
              }
              return currentOrUpcomingRoundsCount > upcomingRoundsToShow;
            }
            default: {
              assertNever(roundStage);
            }
          }
        })();

        const usersThatVoted = new Set(round.votes.map((vote) => vote.userId));

        const submissionsSorted = (() => {
          switch (roundStage) {
            case 'completed': {
              // Return in original order for completed rounds
              return populatedRound.submissions.filter((submission) => {
                return usersThatVoted.has(submission.userId);
              });
            }
            default: {
              // Return in shuffled order for all other rounds
              return seededShuffle(populatedRound.submissions);
            }
          }
        })();

        const submissionsById = submissionsSorted.reduce(
          (acc, submission) => {
            acc[submission._id] = submission;
            return acc;
          },
          {} as Record<string, PopulatedSubmission>,
        );

        return {
          ...populatedRound,
          submissions: submissionsSorted,
          votes: populatedRound.votes.filter((vote) =>
            Boolean(submissionsById[vote.submissionId]),
          ),
          stage: roundStage,
          isHidden,
        };
      },
    );

    const roundsWithData: PopulatedRound[] = roundsWithMostData.map(
      (round, index, rounds) => {
        const previousRound = rounds[index - 1];
        const nextRound = rounds[index + 1];

        return {
          ...round,
          previousRound: previousRound ?? null,
          nextRound: nextRound ?? null,
        };
      },
    );

    const currentRound: PopulatedRound | undefined = roundsWithData.find(
      (round) => {
        return (
          round._id &&
          now >= round.submissionStartDate &&
          now < round.votingEndDate
        );
      },
    );

    const roundsObject = roundsWithData.reduce(
      (acc, round) => {
        const isCurrentRound = (() => {
          if (!currentRound) {
            return false;
          }
          if (currentRound._id !== round._id) {
            return false;
          }

          return currentRound.creatorId === round.creatorId;
        })();

        if (now >= round.votingEndDate) {
          acc.completed.push(round);
        } else if (round.isBonusRound && !isCurrentRound) {
          acc.bonus.push(round);
        } else if (round.isKickoffRound && !isCurrentRound) {
          acc.kickoff.push(round);
        } else if (now < round.submissionStartDate) {
          acc.upcoming.push(round);
        }

        return acc;
      },
      {
        current: currentRound,
        completed: [] as PopulatedRound[],
        upcoming: [] as PopulatedRound[],
        bonus: [] as PopulatedRound[],
        kickoff: [] as PopulatedRound[],
      },
    );
    roundsObject.completed.sort(
      (a, b) => b.submissionStartDate - a.submissionStartDate,
    );

    roundsWithData.forEach((round) => {
      const isCompleted = roundsObject.completed.some(
        (r) => r._id === round._id,
      );
      if (isCompleted) {
        return;
      }
    });

    const numberOfRounds = roundsWithData.length;

    const status = (() => {
      if (roundsObject.completed.length === numberOfRounds) {
        return 'completed' as const;
      }

      const hasStarted = now >= league.leagueStartDate;
      if (!hasStarted) {
        return 'upcoming' as const;
      }

      if (roundsObject.current) {
        return 'active' as const;
      }

      return 'unknown' as const;
    })();

    const populatedLeague = {
      ...league,
      numberOfRounds,
      users,
      status,
      rounds: roundsObject,
    };

    // Calculate playback stats only for completed leagues
    const playback =
      populatedLeague.status === 'completed'
        ? calculatePlaybackStats(populatedLeague, userId)
        : null;

    return { ...populatedLeague, playback };
  });
}

/** Every league the user is in, fully populated. Only for pages that need all of them. */
export async function getUserLeagues(
  userId: string,
): Promise<PopulatedLeague[]> {
  return populateLeagues(await getRawUserLeagues(userId), userId);
}

export type LeagueSummary = {
  _id: string;
  title: string;
  leagueStartDate: number;
  memberCount: number;
};

/**
 * For the home page: the first league in display order (the current one)
 * fully populated, plus lightweight summaries of every other league.
 */
export async function getHomeLeagues(userId: string): Promise<{
  currentLeague: PopulatedLeague | undefined;
  otherLeagues: LeagueSummary[];
}> {
  const rawLeagues = await getRawUserLeagues(userId);
  if (rawLeagues.length === 0) {
    return { currentLeague: undefined, otherLeagues: [] };
  }
  const [currentLeague] = await populateLeagues([rawLeagues[0]], userId);
  return {
    currentLeague,
    otherLeagues: rawLeagues.slice(1).map((league) => ({
      _id: league._id,
      title: league.title,
      leagueStartDate: getStartOfDayAtHour(
        league.leagueStartDate,
        league.transitionHour ?? 0,
      ),
      memberCount: league.users.length,
    })),
  };
}

export async function getUser(
  userId: string,
  leagueId: string,
): Promise<
  | (User & { canCreateBonusRound: boolean; canCreateKickoffRound: boolean })
  | null
> {
  const { usersCollection } = await dbPromise;

  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return null;
  }

  if (leagueId === 'any') {
    return {
      ...user,
      canCreateBonusRound: false,
      canCreateKickoffRound: false,
    };
  }

  const league = await getLeagueById(leagueId, userId);
  if (!league) {
    return null;
  }

  return {
    ...user,
    canCreateBonusRound: league.bonusRoundUserIds.includes(user._id.toString()),
    canCreateKickoffRound: league.kickoffRoundUserIds.includes(
      user._id.toString(),
    ),
  };
}

function getRoundStage({
  currentUserId,
  league,
  round,
  now,
}: {
  currentUserId: string;
  round: Omit<
    PopulatedRound,
    'stage' | 'roundIndex' | 'isHidden' | 'previousRound' | 'nextRound'
  >;
  league: Pick<PopulatedLeague, 'votesPerRound'> & { users: unknown[] };
  now: number;
}): PopulatedRoundStage {
  if (now >= round.votingEndDate) {
    return 'completed';
  }

  if (now >= round.votingStartDate) {
    const yourVotedPoints = round.votes
      .filter((v) => v.userId === currentUserId)
      .reduce((sum, v) => sum + v.points, 0);

    if (yourVotedPoints >= league.votesPerRound) {
      return 'currentUserVotingCompleted';
    }
    return 'voting';
  }

  if (now > round.submissionEndDate) {
    return 'unknown';
  }

  if (now >= round.submissionStartDate) {
    return 'submission';
  }

  if (now < round.submissionStartDate) {
    return 'upcoming';
  }
  return 'unknown';
}

/**
 * A single populated league the user belongs to. `leagueId` may be 'current',
 * which resolves to the active league (or, if none is active, the league whose
 * start date is closest to now). Only populates the leagues it needs to.
 */
export async function getLeagueById(
  leagueId: string,
  userId: string,
): Promise<PopulatedLeague | undefined> {
  const rawLeagues = await getRawUserLeagues(userId);

  if (leagueId !== 'current') {
    const rawLeague = rawLeagues.find((league) => league._id === leagueId);
    if (!rawLeague) {
      return undefined;
    }
    const [league] = await populateLeagues([rawLeague], userId);
    return league;
  }

  if (rawLeagues.length === 0) {
    return undefined;
  }

  // The first league in display order is almost always the active one, so try
  // it on its own before populating everything.
  const [first] = await populateLeagues([rawLeagues[0]], userId);
  if (first.status === 'active') {
    return first;
  }

  const rest = await populateLeagues(rawLeagues.slice(1), userId);
  const leagues = [first, ...rest];
  const current = leagues.find((league) => league.status === 'active');
  if (current) {
    return current;
  }

  const now = Date.now();
  const other = leagues
    .filter((league) => league.status !== 'active')
    .sort((leagueA, leagueB) => {
      const distanceFromA = Math.abs(now - leagueA.leagueStartDate);
      const distanceFromB = Math.abs(now - leagueB.leagueStartDate);
      return distanceFromA - distanceFromB;
    });

  return other[0];
}

/** The populated league containing a round, if the user is in that league. */
export async function getLeagueByRoundId(
  roundId: string,
  userId: string,
): Promise<{ league: PopulatedLeague; round: PopulatedRound } | null> {
  if (!ObjectId.isValid(roundId)) {
    return null;
  }
  const { roundsCollection } = await dbPromise;
  const roundDoc = await roundsCollection.findOne({
    _id: new ObjectId(roundId),
  });
  if (!roundDoc) {
    return null;
  }
  const league = await getLeagueById(roundDoc.leagueId, userId);
  if (!league) {
    return null;
  }
  const round = getAllRounds(league, { includeFake: false }).find(
    (round) => round._id === roundId,
  );
  return round ? { league, round } : null;
}

export async function getUserByCookies(leagueId: string) {
  try {
    const payload = await verifySessionToken();

    if (!payload) {
      return null;
    }

    // Fetch the full user from the database
    const [usersCollection, leaguesCollection] = await Promise.all([
      getCollection<User>('users'),
      getCollection<League>('leagues'),
    ]);
    const [user, league] = await Promise.all([
      usersCollection.findOne({
        _id: new ObjectId(payload.userId),
      }),
      leaguesCollection.findOne({
        users: payload.userId,
        ...(leagueId ? { _id: new ObjectId(leagueId) } : {}),
      }),
    ]);

    if (!user) {
      return null;
    }

    // Convert _id to string for the response
    const userResponse: PopulatedUser = {
      ...user,
      _id: user._id.toString(),
      index: league ? league.users.indexOf(payload.userId) : -1,
    };

    return userResponse;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}
