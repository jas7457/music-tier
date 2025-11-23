import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import Card from "@/components/Card";
import { ProfileData, UserProfileClient } from "./UserProfileClient";
import { Breadcrumb, HomeIcon } from "@/components/Breadcrumb";
import { getUserLeagues, getUser } from "@/lib/data";
import { PopulatedLeague } from "@/lib/types";

type ProfileStats = ProfileData["stats"];

type PageProps = {
  params: { userId: string };
};

export default async function UserProfilePage({ params }: PageProps) {
  const { userId } = params;

  // Verify the session
  const payload = verifySessionToken();
  if (!payload) {
    redirect("/");
  }

  // Fetch user and their leagues directly
  const [user, _leagues] = await Promise.all([
    getUser(userId, "any"),
    getUserLeagues(userId),
  ]);
  const leagues = [..._leagues].sort((leagueA, leagueB) => {
    return leagueB.leagueStartDate - leagueA.leagueStartDate;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">User not found</h2>
          <p className="text-gray-600">
            This user doesn&apos;t exist or you don&apos;t have access to view
            their profile.
          </p>
        </Card>
      </div>
    );
  }

  // Calculate stats across all completed leagues
  const stats = calculateUserStats(userId, leagues);

  const addExtra = (
    league: PopulatedLeague
  ): PopulatedLeague & { yourPoints: number } => {
    const pointsForLeague = stats.pointsPerLeague.find(
      (stat) => stat.league._id === league._id
    );
    const yourPoints = pointsForLeague ? pointsForLeague.points : 0;
    return {
      ...league,
      yourPoints,
    };
  };

  // Separate current and past leagues
  const currentLeagues = leagues
    .filter(
      (league) => league.status === "active" || league.status === "upcoming"
    )
    .map(addExtra);
  const pastLeagues = leagues
    .filter((league) => league.status === "completed")
    .map(addExtra);

  const profileData: ProfileData = {
    user: {
      ...user,
      _id: user._id.toString(),
      index: 0,
    },
    currentLeagues,
    pastLeagues,
    stats,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb
          items={[
            { label: "", icon: <HomeIcon />, href: "/" },
            { label: `${profileData.user.userName}'s Profile` },
          ]}
        />
        <Card className="p-2 md:p-6">
          <UserProfileClient profileData={profileData} />
        </Card>
      </div>
    </div>
  );
}

function calculateUserStats(
  userId: string,
  leagues: PopulatedLeague[]
): ProfileStats {
  let totalPoints = 0;
  const pointsPerLeague: ProfileStats["pointsPerLeague"] = [];
  const totalPointsDetails: ProfileStats["totalPointsDetails"] = [];
  const firstPlaceLeagues: ProfileStats["firstPlaceLeagues"] = [];
  const secondPlaceLeagues: ProfileStats["secondPlaceLeagues"] = [];
  const thirdPlaceLeagues: ProfileStats["thirdPlaceLeagues"] = [];
  const mostVotedSongDetails: ProfileStats["mostVotedSongDetails"] = [];

  const completedLeagues = leagues.filter(
    (league) => league.status === "completed"
  );

  // Calculate totalPoints, pointsPerLeague, and mostVotedSongCount for ALL leagues
  leagues.forEach((league) => {
    // Calculate points for this user in this league
    const userPoints: { [userId: string]: number } = {};

    // Initialize all users with 0 points
    league.users.forEach((user) => {
      userPoints[user._id] = 0;
    });

    // Sum up points from all completed rounds
    league.rounds.completed.forEach((round) => {
      // Find user's submission in this round
      const userSubmission = round.submissions.find((s) => s.userId === userId);

      // Calculate points for this submission
      if (userSubmission) {
        const submissionPoints = round.votes
          .filter((v) => v.submissionId === userSubmission._id)
          .reduce((sum, v) => sum + v.points, 0);

        if (submissionPoints > 0) {
          totalPointsDetails.push({
            league,
            round,
            submission: userSubmission,
            points: submissionPoints,
          });
        }
      }

      round.votes.forEach((vote) => {
        const submission = round.submissions.find(
          (s) => s._id === vote.submissionId
        );
        if (submission) {
          userPoints[submission.userId] =
            (userPoints[submission.userId] || 0) + vote.points;
        }
      });
    });

    // Get this user's points for this league
    const leaguePoints = userPoints[userId] || 0;
    totalPoints += leaguePoints;

    pointsPerLeague.push({
      league,
      points: leaguePoints,
    });

    // Count how many times this user's song got the most votes in a round (all rounds)
    league.rounds.completed.forEach((round) => {
      const votesBySubmission: { [submissionId: string]: number } = {};

      round.votes.forEach((vote) => {
        votesBySubmission[vote.submissionId] =
          (votesBySubmission[vote.submissionId] || 0) + vote.points;
      });

      const sortedSubmissions = Object.entries(votesBySubmission)
        .map(([subId, points]) => ({ submissionId: subId, points }))
        .sort((a, b) => b.points - a.points);

      if (sortedSubmissions.length > 0) {
        const topSubmission = round.submissions.find(
          (s) => s._id === sortedSubmissions[0].submissionId
        );
        if (topSubmission && topSubmission.userId === userId) {
          mostVotedSongDetails.push({
            league,
            submission: topSubmission,
            round,
            points: sortedSubmissions[0].points,
          });
        }
      }
    });
  });

  // Calculate placement counts ONLY for completed leagues
  completedLeagues.forEach((league) => {
    const userPoints: { [userId: string]: number } = {};

    // Initialize all users with 0 points
    league.users.forEach((user) => {
      userPoints[user._id] = 0;
    });

    // Sum up points from all completed rounds
    league.rounds.completed.forEach((round) => {
      round.votes.forEach((vote) => {
        const submission = round.submissions.find(
          (s) => s._id === vote.submissionId
        );
        if (submission) {
          userPoints[submission.userId] =
            (userPoints[submission.userId] || 0) + vote.points;
        }
      });
    });

    // Determine placement
    const sortedPoints = Object.entries(userPoints)
      .map(([uid, points]) => ({ userId: uid, points }))
      .sort((a, b) => b.points - a.points);

    const userPlacement = sortedPoints.findIndex((p) => p.userId === userId);
    if (userPlacement === 0) {
      firstPlaceLeagues.push({
        leagueId: league._id,
        leagueName: league.title,
        points: userPoints[userId] || 0,
      });
    } else if (userPlacement === 1) {
      secondPlaceLeagues.push({
        leagueId: league._id,
        leagueName: league.title,
        points: userPoints[userId] || 0,
      });
    } else if (userPlacement === 2) {
      thirdPlaceLeagues.push({
        leagueId: league._id,
        leagueName: league.title,
        points: userPoints[userId] || 0,
      });
    }
  });

  return {
    totalPoints,
    totalPointsDetails,
    firstPlaceLeagues,
    secondPlaceLeagues,
    thirdPlaceLeagues,
    mostVotedSongDetails,
    pointsPerLeague,
    totalLeagues: leagues.length,
    completedLeagues: completedLeagues.length,
  };
}
