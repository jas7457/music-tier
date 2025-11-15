import { getCollection } from "@/lib/mongodb";
import { League, Round, SongSubmission, User, Vote } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { ONE_DAY_MS } from "./utils/time";
import {
  PopulatedLeague,
  PopulatedRound,
  PopulatedRoundStage,
  PopulatedSubmission,
  PopulatedUser,
  PopulatedVote,
} from "./types";
import { verifySessionToken } from "./auth";

// Seeded random number generator
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return function () {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

// Fisher-Yates shuffle with seeded random
export function seededShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

const dbPromise = (async () => {
  const [
    usersCollection,
    leaguesCollection,
    roundsCollection,
    submissionsCollection,
    votesCollection,
  ] = await Promise.all([
    getCollection<User>("users"),
    getCollection<League>("leagues"),
    getCollection<Round>("rounds"),
    getCollection<SongSubmission>("songSubmissions"),
    getCollection<Vote>("votes"),
  ]);
  return {
    usersCollection,
    leaguesCollection,
    roundsCollection,
    submissionsCollection,
    votesCollection,
  };
})();

export async function getUserLeagues(
  userId: string
): Promise<PopulatedLeague[]> {
  const {
    leaguesCollection,
    usersCollection,
    roundsCollection,
    submissionsCollection,
    votesCollection,
  } = await dbPromise;

  // Find leagues where user is a member
  const leagues = (
    await leaguesCollection
      .find({
        // find leagues where userId is in the users array
        users: userId,
      })
      .sort({ _id: -1 }) // Sort by newest first
      .toArray()
  ).map((league) => {
    return { ...league, _id: league._id.toString() };
  });

  // get the current timestamp in the east coast of the usa
  const now = Date.now();

  const leagueWithData = await Promise.all(
    leagues.map(async (league) => {
      let currentStartDate = league.leagueStartDate;

      const [_rounds, _users] = await Promise.all([
        roundsCollection.find({ leagueId: league._id.toString() }).toArray(),
        usersCollection
          .find({
            _id: { $in: league.users.map((id) => new ObjectId(id)) },
          })
          .toArray(),
      ]);
      const rounds = _rounds.map((round) => ({
        ...round,
        _id: round._id.toString(),
      }));
      const users: PopulatedUser[] = league.users
        .map((userId) => _users.find((u) => u._id.toString() === userId))
        .filter((user) => user !== undefined)
        .map((user, index) => ({
          ...user,
          _id: user._id.toString(),
          index,
          canCreateBonusRound: league.bonusRoundUserIds.includes(userId),
        }));

      const usersById = users.reduce((acc, user, index) => {
        const userIndex = league.users.indexOf(user._id);
        acc[user._id.toString()] = {
          user,
          index: userIndex === -1 ? index : userIndex,
        };
        return acc;
      }, {} as Record<string, { user: PopulatedUser; index: number }>);

      const populatedRounds = await Promise.all(
        rounds.map(async (round) => {
          const [_submissions, _votes] = await Promise.all([
            submissionsCollection
              .find({ roundId: round._id.toString() })
              .toArray(),
            votesCollection.find({ roundId: round._id.toString() }).toArray(),
          ]);

          const submissions: PopulatedSubmission[] = _submissions.map(
            (submission) => ({ ...submission, _id: submission._id.toString() })
          );

          const votes: PopulatedVote[] = _votes.map((vote) => ({
            ...vote,
            _id: vote._id.toString(),
            userGuessObject: vote.userGuessId
              ? usersById[vote.userGuessId].user
              : undefined,
          }));

          return {
            ...round,
            _id: round._id.toString(),
            submissions,
            votes,
          };
        })
      );

      const normalUserRounds: Array<
        (typeof populatedRounds)[number] & { roundIndex: number }
      > = league.users
        .map((userId, index) => {
          const user = usersById[userId]?.user;
          if (!user) {
            return undefined;
          }
          const populatedRound = populatedRounds.find(
            (round) => round.creatorId === userId && !round.isBonusRound
          );
          if (populatedRound) {
            return { ...populatedRound, roundIndex: index };
          } else {
            const inAWeek = now + 7 * ONE_DAY_MS;
            const roundIndex = usersById[userId]?.index ?? index;

            return {
              _id: "",
              isPending: true,
              leagueId: league._id.toString(),
              creatorId: userId,
              title: "",
              description: "",
              submissions: [],
              votes: [],
              submissionStartDate: inAWeek,
              submissionEndDate: inAWeek,
              votingStartDate: inAWeek,
              votingEndDate: inAWeek,
              roundIndex,
              creatorObject: usersById[userId]?.user,
              stage: "upcoming" as const,
              userSubmission: undefined,
              isBonusRound: false,
            };
          }
        })
        .filter((round) => round !== undefined)
        .map((round, index) => ({ ...round, roundIndex: index }));

      const bonusRounds: Array<
        (typeof populatedRounds)[number] & { roundIndex: number }
      > = league.bonusRoundUserIds
        .map((userId) => {
          const user = usersById[userId]?.user;
          if (!user) {
            return undefined;
          }
          return populatedRounds.find(
            (round) => round.creatorId === userId && round.isBonusRound
          );
        })
        .filter((round) => round !== undefined)
        .map((round, index) => ({
          ...round,
          roundIndex: index + league.users.length,
        }));

      const roundsWithData: PopulatedRound[] = [
        ...normalUserRounds,
        ...bonusRounds,
      ].map((round) => {
        const userSubmission = round.submissions.find(
          (submission) => submission.userId === userId
        );

        const lastSubmission = round.submissions.reduce(
          (latest, submission) => {
            if (!latest) {
              return submission;
            }
            return submission.submissionDate > latest.submissionDate
              ? submission
              : latest;
          },
          undefined as PopulatedSubmission | undefined
        );

        const lastVote = round.votes.reduce((latest, vote) => {
          if (!latest) {
            return vote;
          }
          return vote.voteDate > latest.voteDate ? vote : latest;
        }, undefined as PopulatedVote | undefined);

        const submissionStartDate = currentStartDate;
        const submissionEndDate = (() => {
          const allSubmitted = round.submissions.length >= league.users.length;

          if (allSubmitted && lastSubmission) {
            return lastSubmission.submissionDate;
          }
          return submissionStartDate + league.daysForSubmission * ONE_DAY_MS;
        })();
        const votingStartDate = submissionEndDate;
        const votingEndDate = (() => {
          const roundPoints = round.votes.reduce(
            (acc, vote) => acc + vote.points,
            0
          );
          if (
            roundPoints >= league.users.length * league.votesPerRound &&
            lastVote
          ) {
            return lastVote.voteDate;
          }
          return votingStartDate + league.daysForVoting * ONE_DAY_MS;
        })();
        currentStartDate = votingEndDate;
        const populatedRound: Omit<PopulatedRound, "stage"> = {
          ...round,
          _id: round._id.toString(),
          userSubmission,
          submissionStartDate,
          submissionEndDate,
          votingStartDate,
          votingEndDate,
          creatorObject: usersById[round.creatorId]?.user,
        };

        const roundStage = getRoundStage({
          currentUserId: userId,
          league,
          round: populatedRound,
        });

        const submissionsSorted = (() => {
          switch (roundStage) {
            case "completed": {
              // Return in original order for completed rounds
              return populatedRound.submissions;
            }
            default: {
              return populatedRound.submissions;
              // Shuffle with round ID as seed for reproducible randomization
              // return seededShuffle(populatedRound.submissions, round._id);
            }
          }
        })();

        return {
          ...populatedRound,
          submissions: submissionsSorted,
          stage: roundStage,
        };
      });

      const currentRound: PopulatedRound | undefined = await (async () => {
        const currentRound = roundsWithData.find((round) => {
          return now >= round.submissionStartDate && now < round.votingEndDate;
        });

        if (!currentRound) {
          return undefined;
        }

        if (currentRound.isBonusRound) {
          const hasIncompleteBefore = roundsWithData.some((round) => {
            if (round._id === currentRound._id) {
              return false;
            }
            if (round.roundIndex >= currentRound.roundIndex) {
              return true;
            }
            return round.stage !== "completed";
          });
          if (hasIncompleteBefore) {
            return undefined;
          }
        }
        return currentRound;
      })();

      const roundsObject = roundsWithData.reduce(
        (acc, round) => {
          if (now >= round.votingEndDate) {
            acc.completed.push(round);
          } else if (round.isBonusRound && round._id !== currentRound?._id) {
            acc.bonus.push(round);
          } else if (round.isPending) {
            acc.pending.push(round);
          }

          return acc;
        },
        {
          current: currentRound,
          completed: [] as PopulatedRound[],
          upcoming: [] as PopulatedRound[],
          bonus: [] as PopulatedRound[],
          pending: [] as PopulatedRound[],
        }
      );
      roundsWithData.forEach((round) => {
        const isCompleted = roundsObject.completed.some(
          (r) => r._id === round._id
        );
        if (isCompleted) {
          return;
        }

        const userIndex = usersById[round.creatorId]?.index ?? -1;
        const hasPendingBefore = roundsObject.pending.some(
          (round) => round.roundIndex < userIndex
        );
        if (hasPendingBefore && !round.isBonusRound) {
          roundsObject.pending.push(round);
          if (round._id === roundsObject.current?._id) {
            roundsObject.current = undefined;
          }
          return;
        }
        if (
          now < round.submissionStartDate &&
          !round.isBonusRound &&
          !round.isPending
        ) {
          roundsObject.upcoming.push(round);
        }
      });

      const numberOfRounds = users.length & roundsObject.bonus.length;

      const status = (() => {
        if (roundsObject.completed.length === numberOfRounds) {
          return "completed" as const;
        }

        const hasStarted = now > league.leagueStartDate;
        if (!hasStarted) {
          return "upcoming" as const;
        }

        if (roundsObject.pending.length > 0) {
          return "pending" as const;
        }

        if (roundsObject.current) {
          return "active" as const;
        }
        return "unknown" as const;
      })();

      return {
        ...league,
        numberOfRounds,
        users,
        status,
        rounds: roundsObject,
      };
    })
  );

  return leagueWithData;
}

export async function getUser(
  userId: string,
  leagueId: string
): Promise<(User & { canCreateBonusRound: boolean }) | null> {
  const { usersCollection } = await dbPromise;

  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return null;
  }

  if (leagueId === "any") {
    return {
      ...user,
      canCreateBonusRound: false,
    };
  }

  const league = await getLeagueById(leagueId, userId);
  if (!league) {
    return null;
  }

  return {
    ...user,
    canCreateBonusRound: league.bonusRoundUserIds.includes(user._id.toString()),
  };
}

function getRoundStage({
  currentUserId,
  league,
  round,
}: {
  currentUserId: string;
  round: Omit<PopulatedRound, "stage" | "roundIndex">;
  league: Pick<PopulatedLeague, "votesPerRound"> & { users: unknown[] };
}): PopulatedRoundStage {
  const now = Date.now();

  const allUsersSubmitted = round.submissions.length >= league.users.length;
  const roundPoints = round.votes.reduce((acc, vote) => acc + vote.points, 0);
  const allUsersVoted =
    roundPoints >= league.users.length * league.votesPerRound;

  if (allUsersVoted) {
    return "completed";
  }

  const isVotingOpen = (() => {
    if (now >= round.votingEndDate) {
      return false;
    }
    if (allUsersSubmitted) {
      return true;
    }
    return false;
  })();
  const isSubmissionOpen =
    !isVotingOpen &&
    now >= round.submissionStartDate &&
    now < round.submissionEndDate;

  if (now >= round.votingEndDate) {
    return "completed";
  }
  if (now < round.submissionStartDate) {
    return "upcoming";
  }
  if (isVotingOpen) {
    const yourVotedPoints = round.votes
      .filter((v) => v.userId === currentUserId)
      .reduce((sum, v) => sum + v.points, 0);

    if (yourVotedPoints >= league.votesPerRound) {
      return "currentUserVotingCompleted";
    }
    return "voting";
  }
  if (isSubmissionOpen) {
    return "submission";
  }
  return "unknown";
}

export async function getLeagueById(
  leagueId: string,
  userId: string
): Promise<PopulatedLeague | undefined> {
  const leagues = await getUserLeagues(userId);
  if (leagueId === "current") {
    const current = leagues.find((league) => league.status === "active");
    if (current) {
      return current;
    }

    const now = Date.now();
    const other = leagues
      .filter((league) => league.status !== "active")
      .sort((leagueA, leagueB) => {
        const distanceFromA = Math.abs(now - leagueA.leagueStartDate);
        const distanceFromB = Math.abs(now - leagueB.leagueStartDate);
        return distanceFromA - distanceFromB;
      });

    return other[0];
  }
  return leagues.find((league) => league._id.toString() === leagueId);
}

export async function getUserByCookies(leagueId: string) {
  try {
    const payload = verifySessionToken();

    if (!payload) {
      return null;
    }

    // Fetch the full user from the database
    const [usersCollection, leaguesCollection] = await Promise.all([
      getCollection<User>("users"),
      getCollection<League>("leagues"),
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
      canCreateBonusRound: league
        ? league.bonusRoundUserIds.includes(payload.userId)
        : false,
    };

    return userResponse;
  } catch (error) {
    console.error("Error fetching session:", error);
    return null;
  }
}
