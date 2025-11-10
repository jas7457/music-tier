import { getCollection } from "@/lib/mongodb";
import { League, Round, SongSubmission, User, Vote } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { getTrackDetails, SpotifyTrack } from "./spotify";
import { ONE_DAY_MS } from "./utils/time";
import { PopulatedLeague, PopulatedRound, PopulatedRoundStage } from "./types";

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
  const leagues = await leaguesCollection
    .find({
      // find leagues where userId is in the users array
      users: userId,
    })
    .toArray();

  const now = Date.now();

  const leagueWithData = await Promise.all(
    leagues.map(async (league) => {
      let currentStartDate = league.leagueStartDate;

      const [rounds, users] = await Promise.all([
        roundsCollection.find({ leagueId: league._id.toString() }).toArray(),
        usersCollection
          .find({
            // @ts-ignore - this actually does work
            _id: { $in: league.users.map((id) => new ObjectId(id)) },
          })
          .toArray(),
      ]);

      const populatedRounds = await Promise.all(
        rounds.map(async (round) => {
          const [_submissions, votes] = await Promise.all([
            submissionsCollection
              .find({ roundId: round._id.toString() })
              .toArray(),
            votesCollection.find({ roundId: round._id.toString() }).toArray(),
          ]);

          const submissions = await Promise.all(
            _submissions.map(async (submission) => {
              const trackInfoPromise =
                spotifyTrackInfoById[submission.trackId] ??
                getTrackDetails(submission.trackId, accessToken);

              spotifyTrackInfoById[submission.trackId] = trackInfoPromise;

              const trackInfo = await trackInfoPromise;
              return { ...submission, trackInfo };
            })
          );

          return {
            ...round,
            submissions,
            votes,
          };
        })
      );

      const usersById = users.reduce((acc, user) => {
        acc[user._id] = user;
        return acc;
      }, {} as Record<string, User>);

      const roundsWithData: PopulatedRound[] = (
        await Promise.all(
          league.users.map(async (userId) => {
            const user = usersById[userId];
            if (!user) {
              return undefined;
            }
            return populatedRounds.find((round) => round.creatorId === userId);
          })
        )
      )
        .filter((round): round is NonNullable<typeof round> => Boolean(round))
        .map((round, index) => {
          const userSubmission = round.submissions.find(
            (submission) => submission.userId === userId
          );

          const submissionStartDate = currentStartDate;
          const submissionEndDate =
            submissionStartDate + league.daysForSubmission * ONE_DAY_MS;
          const votingStartDate = submissionEndDate;
          const votingEndDate =
            votingStartDate + league.daysForVoting * ONE_DAY_MS;
          currentStartDate = votingEndDate + ONE_DAY_MS;
          const populatedRound = {
            ...round,
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
          const submissionStart = round.submissionStartDate;
          const submissionEnd =
            submissionStart + league.daysForSubmission * 24 * 60 * 60 * 1000;
          return now >= submissionStart && now < submissionEnd;
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
          const submissionStart = round.submissionStartDate;
          const submissionEnd =
            submissionStart + league.daysForSubmission * 24 * 60 * 60 * 1000;
          const votingEnd =
            submissionEnd + league.daysForVoting * 24 * 60 * 60 * 1000;

          if (now >= votingEnd) {
            // Completed round
            acc.completed.push({ ...round, roundIndex: index });
          } else if (now < submissionStart) {
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
  league: League;
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
