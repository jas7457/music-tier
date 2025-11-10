import { getCollection } from "@/lib/mongodb";
import { League, Round, SongSubmission, User, Vote } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { getTrackDetails, SpotifyTrack } from "./spotify";
import { ONE_DAY_MS } from "./utils/time";
import {
  PopulatedLeague,
  PopulatedRound,
  PopulatedRoundStage,
  PopulatedSubmission,
  PopulatedUser,
  PopulatedVote,
} from "./types";

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
  userId: string,
  accessToken: string
): Promise<PopulatedLeague[]> {
  const {
    leaguesCollection,
    usersCollection,
    roundsCollection,
    submissionsCollection,
    votesCollection,
  } = await dbPromise;

  const spotifyTrackInfoById = {} as Record<string, Promise<SpotifyTrack>>;

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
  const now = (() => {
    const now = new Date();
    const options = { timeZone: "America/New_York" };
    const local = new Date(now.toLocaleString("en-US", options));
    return local.getTime();
  })();

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

      const populatedRounds = await Promise.all(
        rounds.map(async (round) => {
          const [_submissions, _votes] = await Promise.all([
            submissionsCollection
              .find({ roundId: round._id.toString() })
              .toArray(),
            votesCollection.find({ roundId: round._id.toString() }).toArray(),
          ]);

          const submissions: PopulatedSubmission[] = (
            await Promise.all(
              _submissions.map(async (submission) => {
                const trackInfoPromise =
                  spotifyTrackInfoById[submission.trackId] ??
                  getTrackDetails(submission.trackId, accessToken);

                spotifyTrackInfoById[submission.trackId] = trackInfoPromise;

                const trackInfo = await trackInfoPromise;
                return { ...submission, trackInfo };
              })
            )
          ).map((submission) => {
            return { ...submission, _id: submission._id.toString() };
          });

          const votes: PopulatedVote[] = _votes.map((vote) => ({
            ...vote,
            _id: vote._id.toString(),
          }));

          return {
            ...round,
            _id: round._id.toString(),
            submissions,
            votes,
          };
        })
      );

      const usersById = users.reduce((acc, user) => {
        acc[user._id.toString()] = user;
        return acc;
      }, {} as Record<string, PopulatedUser>);

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
          };

          return {
            ...populatedRound,
            stage: getRoundStage({
              currentUserId: userId,
              league,
              round: populatedRound,
            }),
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

        const submissions = await Promise.all(
          currentRound.submissions.map(async (submission) => {
            const trackInfo = await getTrackDetails(
              submission.trackId,
              accessToken
            );
            return { ...submission, trackInfo };
          })
        );
        return { ...currentRound, roundIndex: currentRoundIndex, submissions };
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

      return { ...league, users, rounds: roundsObject };
    })
  );

  return leagueWithData;
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
