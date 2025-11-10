import { getCollection } from "@/lib/mongodb";
import { League, Round, SongSubmission, User, Vote } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { getTrackDetails, SpotifyTrack } from "./spotify";

export type GetUserLeagueReturnType = Awaited<
  ReturnType<typeof getUserLeagues>
>;

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

export async function getUserLeagues(userId: string, accessToken: string) {
  const {
    leaguesCollection,
    usersCollection,
    roundsCollection,
    submissionsCollection,
    votesCollection,
  } = await dbPromise;

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
      const [rounds, users] = await Promise.all([
        roundsCollection.find({ leagueId: league._id.toString() }).toArray(),
        usersCollection
          .find({
            // @ts-ignore - this actually does work
            _id: { $in: league.users.map((id) => new ObjectId(id)) },
          })
          .toArray(),
      ]);

      const roundsWithData = await Promise.all(
        rounds.map(async (round) => {
          const [submissions, votes] = await Promise.all([
            submissionsCollection
              .find({ roundId: round._id.toString() })
              .toArray(),
            votesCollection.find({ roundId: round._id.toString() }).toArray(),
          ]);

          const userSubmission = submissions.find(
            (submission) => submission.userId === userId
          );

          const userSubmissionWithTrack = userSubmission
            ? {
                ...userSubmission,
                trackInfo: await getTrackDetails(
                  userSubmission.trackId,
                  accessToken
                ),
              }
            : undefined;

          return {
            ...round,
            submissions,
            votes,
            userSubmission: userSubmissionWithTrack,
          };
        })
      );

      type RoundWithData = (typeof roundsWithData)[number] & {
        roundIndex: number;
      };
      type CurrentRound = Omit<RoundWithData, "submissions"> & {
        submissions: (SongSubmission & { trackInfo: SpotifyTrack })[];
      };

      const currentRound: CurrentRound | undefined = await (async () => {
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
          completed: [] as RoundWithData[],
          upcoming: [] as RoundWithData[],
        }
      );

      return { ...league, users, rounds: roundsObject };
    })
  );

  return leagueWithData;
}

export async function getSpecificRound(roundId: string) {
  const { roundsCollection, submissionsCollection, votesCollection } =
    await dbPromise;

  // @ts-ignore - this does work
  const round = await roundsCollection.findOne({ _id: new ObjectId(roundId) });
  if (!round) {
    throw new Error("Round not found");
  }

  const [submissions, votes] = await Promise.all([
    submissionsCollection.find({ roundId: round._id.toString() }).toArray(),
    votesCollection.find({ roundId: round._id.toString() }).toArray(),
  ]);

  return { ...round, submissions, votes };
}
