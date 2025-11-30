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
import { seededShuffle } from "./utils/seededShuffle";
import { UPCOMING_ROUNDS_TO_SHOW } from "./utils/constants";

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
      // Normalize league start date to midnight in America/New_York timezone
      const reformattedDate = getStartOfDay(league.leagueStartDate);

      league.leagueStartDate = reformattedDate;

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
            (submission) => ({
              ...submission,
              _id: submission._id.toString(),
              userObject: usersById[submission.userId].user,
            })
          );

          const votes: PopulatedVote[] = _votes.map((vote) => ({
            ...vote,
            _id: vote._id.toString(),
            userObject: usersById[vote.userId]?.user,
            userGuessObject: vote.userGuessId
              ? usersById[vote.userGuessId]?.user
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
              submissionDate: inAWeek,
              lastUpdatedDate: inAWeek,
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

        const sortedSubmissions = [...round.submissions].sort(
          (a, b) => a.submissionDate - b.submissionDate
        );
        const firstSubmission = sortedSubmissions[0];
        const lastSubmission = sortedSubmissions[sortedSubmissions.length - 1];

        const sortedVotes = [...round.votes].sort(
          (a, b) => a.voteDate - b.voteDate
        );
        const firstVote = sortedVotes[0];
        const lastVote = sortedVotes[sortedVotes.length - 1];

        const submissionStartDate = (() => {
          if (firstSubmission) {
            return Math.min(currentStartDate, firstSubmission.submissionDate);
          }
          return currentStartDate;
        })();
        const submissionEndDate = (() => {
          const normalEnd = getEndOfDay(
            submissionStartDate + league.daysForSubmission * ONE_DAY_MS
          );

          const allSubmitted = round.submissions.length >= league.users.length;
          if (allSubmitted && lastSubmission) {
            return Math.min(normalEnd, lastSubmission.submissionDate);
          }
          return normalEnd;
        })();

        const hadNoSubmissions =
          round.submissions.length === 0 && now > submissionEndDate;

        const votingStartDate = (() => {
          if (hadNoSubmissions) {
            return submissionEndDate;
          }
          if (firstVote) {
            return Math.min(submissionEndDate, firstVote.voteDate);
          }
          return submissionEndDate;
        })();
        const votingEndDate = (() => {
          if (hadNoSubmissions) {
            return submissionEndDate;
          }
          const normalEnd = getEndOfDay(
            votingStartDate + league.daysForVoting * ONE_DAY_MS
          );
          const roundPoints = round.votes.reduce(
            (acc, vote) => acc + vote.points,
            0
          );
          if (
            roundPoints >= league.users.length * league.votesPerRound &&
            lastVote
          ) {
            return Math.min(normalEnd, lastVote.voteDate);
          }
          return normalEnd;
        })();
        currentStartDate = votingEndDate;

        const maybeTomorrow = getStartOfDay(currentStartDate + 3_000);
        const isPracticallyTomorrow =
          getStartOfDay(currentStartDate) !== maybeTomorrow;
        if (isPracticallyTomorrow) {
          currentStartDate = maybeTomorrow;
        }

        const populatedRound: Omit<PopulatedRound, "stage"> = {
          ...round,
          _id: round._id.toString(),
          userSubmission,
          submissionStartDate,
          submissionEndDate,
          votingStartDate,
          votingEndDate,
          creatorObject: usersById[round.creatorId]?.user,
          isHidden: false,
        };

        const roundStage = getRoundStage({
          currentUserId: userId,
          league,
          round: populatedRound,
          now,
        });

        const submissionsSorted = (() => {
          switch (roundStage) {
            case "completed": {
              // Return in original order for completed rounds
              return populatedRound.submissions;
            }
            default: {
              // Return in shuffled order for all other rounds
              return seededShuffle(populatedRound.submissions);
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
          } else if (round.isPending && !isCurrentRound) {
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
        if (hasPendingBefore && !round.isBonusRound && !round.isPending) {
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
          const isHidden = (() => {
            if (round.creatorId === userId) {
              return false;
            }
            if (
              roundsObject.upcoming.length + (currentRound ? 1 : 0) >=
              UPCOMING_ROUNDS_TO_SHOW
            ) {
              return true;
            }
            return false;
          })();
          round.isHidden = isHidden;
          roundsObject.upcoming.push(round);
        }
      });

      const numberOfRounds = roundsWithData.length;

      const status = (() => {
        if (roundsObject.completed.length === numberOfRounds) {
          return "completed" as const;
        }

        const hasStarted = now >= league.leagueStartDate;
        if (!hasStarted) {
          return "upcoming" as const;
        }

        if (roundsObject.current) {
          return "active" as const;
        }

        if (roundsObject.pending.length > 0) {
          return "pending" as const;
        }

        return "unknown" as const;
      })();

      roundsObject.pending.sort((a, b) => a.roundIndex - b.roundIndex);
      roundsObject.upcoming.sort((a, b) => a.roundIndex - b.roundIndex);

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
  now,
}: {
  currentUserId: string;
  round: Omit<PopulatedRound, "stage" | "roundIndex">;
  league: Pick<PopulatedLeague, "votesPerRound"> & { users: unknown[] };
  now: number;
}): PopulatedRoundStage {
  if (now >= round.votingEndDate) {
    return "completed";
  }

  if (now >= round.votingStartDate) {
    const yourVotedPoints = round.votes
      .filter((v) => v.userId === currentUserId)
      .reduce((sum, v) => sum + v.points, 0);

    if (yourVotedPoints >= league.votesPerRound) {
      return "currentUserVotingCompleted";
    }
    return "voting";
  }

  if (now > round.submissionEndDate) {
    return "unknown";
  }

  if (now >= round.submissionStartDate) {
    return "submission";
  }

  if (now < round.submissionStartDate) {
    return "upcoming";
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

function getStartOfDay(date: number): number {
  const d = new Date(date);

  // Get the year, month, day in Eastern time for this timestamp
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(d);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  return new Date(`${year}-${month}-${day}T00:00:00-05:00`).getTime();
}

function getEndOfDay(date: number): number {
  // Get start of day, then add 23 hours 59 minutes in milliseconds
  return getStartOfDay(date) + ONE_DAY_MS - 1000;
}
