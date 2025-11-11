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
function seededShuffle<T>(array: T[], seed: string): T[] {
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
      const users: PopulatedUser[] = _users.map((user, index) => ({
        ...user,
        _id: user._id.toString(),
        index,
      }));

      const usersById = users.reduce((acc, user) => {
        acc[user._id.toString()] = user;
        return acc;
      }, {} as Record<string, PopulatedUser>);

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
              ? usersById[vote.userGuessId]
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

      const roundsWithData: PopulatedRound[] = league.users
        .map((userId) => {
          const user = usersById[userId];
          if (!user) {
            return undefined;
          }
          return populatedRounds.find((round) => round.creatorId === userId);
        })
        .filter((round): round is NonNullable<typeof round> => Boolean(round))
        .map((round, index) => {
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
            const allSubmitted =
              round.submissions.length >= league.users.length;

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
          const populatedRound = {
            ...round,
            _id: round._id.toString(),
            userSubmission,
            submissionStartDate,
            submissionEndDate,
            votingStartDate,
            votingEndDate,
            roundIndex: index,
            creatorObject: usersById[round.creatorId],
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
                // Shuffle with round ID as seed for reproducible randomization
                return seededShuffle(populatedRound.submissions, round._id);
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
        const currentRoundIndex = roundsWithData.findIndex((round) => {
          return now >= round.submissionStartDate && now < round.votingEndDate;
        });
        const currentRound = roundsWithData[currentRoundIndex];

        if (!currentRound) {
          return undefined;
        }

        return { ...currentRound, roundIndex: currentRoundIndex };
      })();

      const roundsObject = roundsWithData.reduce(
        (acc, round, index) => {
          if (now >= round.votingEndDate) {
            // Completed round
            acc.completed.push({ ...round, roundIndex: index });
          } else if (now < round.submissionStartDate) {
            // Upcoming round
            acc.upcoming.push({ ...round, roundIndex: index });
          }

          return acc;
        },
        {
          current: currentRound,
          completed: [] as PopulatedRound[],
          upcoming: [] as PopulatedRound[],
        }
      );

      const numberOfRounds = users.length;

      const status = (() => {
        if (roundsObject.completed.length === numberOfRounds) {
          return "completed" as const;
        }

        const hasStarted = league.leagueStartDate <= now;
        if (!hasStarted) {
          return "upcoming" as const;
        }

        if (roundsObject.current) {
          return "active" as const;
        }
        return "pending" as const;
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

export async function getUser(userId: string): Promise<User | null> {
  const { usersCollection } = await dbPromise;

  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return null;
  }
  return user;
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

export async function getUserBySessionToken(
  sessionToken: string
): Promise<PopulatedUser | null> {
  try {
    if (!sessionToken) {
      return null;
    }

    const payload = verifySessionToken(sessionToken);

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
      leaguesCollection.findOne({ users: payload.userId }),
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
    console.error("Error fetching session:", error);
    return null;
  }
}
