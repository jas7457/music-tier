import { TrackInfo } from "@/databaseTypes";
import type {
  LeaguePlaybackStats,
  PopulatedLeague,
  PopulatedRound,
  PopulatedSubmission,
  PopulatedUser,
  PopulatedVote,
} from "./types";
import { getAllRounds } from "./utils/getAllRounds";
import { getPlaces } from "./utils/getPlaces";

export function calculatePlaybackStats(
  league: Omit<PopulatedLeague, "playback">,
  userId: string
): LeaguePlaybackStats {
  const completedRounds = getAllRounds({ ...league, playback: null }).filter(
    (r) => r.stage === "completed"
  );
  const usersById = league.users.reduce((acc, user) => {
    acc[user._id] = user;
    return acc;
  }, {} as { [userId: string]: PopulatedUser });

  if (completedRounds.length === 0) {
    return {
      topSong: null,
      userStats: null,
      biggestFan: null,
      biggestCritic: null,
      mostWinsUser: null,
      fastestSubmitter: null,
      slowestSubmitter: null,
      fastestVoter: null,
      slowestVoter: null,
      mostConsistent: null,
      conspirators: null,
      userTopSong: null,
      bestGuesser: null,
      worstGuesser: null,
      mostNotedSong: null,
      allUserTopSongs: [],
      allUserWins: [],
    };
  }

  const userData = league.users.reduce(
    (acc, user) => {
      acc[user._id] = {
        user,
        places: [],
        points: [],
        submissions: [],
        votes: [],
        pointsByFriends: {},
        topSong: null,
        totalPoints: 0,
        guesses: [],
      };
      return acc;
    },
    {} as {
      [userId: string]: {
        user: PopulatedUser;
        places: Array<{ place: number; round: PopulatedRound }>;
        topSong: NonNullable<
          LeaguePlaybackStats["topSong"] & {
            round: PopulatedRound;
          }
        > | null;
        pointsByFriends: Record<string, LeaguePlaybackStats["biggestFan"]>;
        guesses: NonNullable<LeaguePlaybackStats["bestGuesser"]>["guesses"];
        points: Array<{
          trackInfo: TrackInfo;
          points: number;
          voters: number;
          user: PopulatedUser;
          submission: PopulatedSubmission;
          round: PopulatedRound;
        }>;
        totalPoints: number;
        submissions: Array<{
          submission: PopulatedSubmission;
          user: PopulatedUser;
          notes: Array<{
            text: string;
            user: PopulatedUser;
          }>;
          timeToSubmit: number;
        }>;
        votes: Array<{
          vote: PopulatedVote;
          timeToVote: number;
        }>;
      };
    }
  );

  const { roundsById, submissionsById } = completedRounds.reduce(
    (acc, round) => {
      acc.roundsById[round._id] = round;
      round.submissions.forEach((submission) => {
        acc.submissionsById[submission._id] = submission;
      });
      return acc;
    },
    {
      roundsById: {} as { [roundId: string]: PopulatedRound },
      submissionsById: {} as { [submissionId: string]: PopulatedSubmission },
    }
  );

  completedRounds.forEach((round) => {
    round.votes.forEach((vote) => {
      const voteUser = userData[vote.userId];
      voteUser.votes.push({
        vote,
        timeToVote: vote.voteDate - round.votingStartDate,
      });

      const submission = submissionsById[vote.submissionId];
      const submissionUser = userData[submission.userId];

      const currentPointInfo = submissionUser.points.find(
        (point) => point.submission._id === submission._id
      );
      const pointInfo = currentPointInfo ?? {
        trackInfo: submission.trackInfo,
        points: 0,
        submission,
        voters: 0,
        round,
        user: usersById[submission.userId],
      };

      pointInfo.points += vote.points;
      submissionUser.totalPoints += vote.points;

      if (vote.points > 0) {
        pointInfo.voters += 1;

        const pointsByFriend = submissionUser.pointsByFriends[vote.userId] ?? {
          points: 0,
          songs: [],
          user: usersById[vote.userId],
        };
        pointsByFriend.points += vote.points;
        pointsByFriend.songs.push({
          trackInfo: submission.trackInfo,
          points: vote.points,
          round,
        });
        submissionUser.pointsByFriends[vote.userId] = pointsByFriend;
      }

      if (!currentPointInfo) {
        submissionUser.points.push(pointInfo);
      }

      if (
        !submissionUser.topSong ||
        pointInfo.points > submissionUser.topSong!.points
      ) {
        submissionUser.topSong = pointInfo;
      }

      if (vote.userGuessId && vote.userGuessObject) {
        userData[vote.userId].guesses.push({
          trackInfo: submission.trackInfo,
          submitter: usersById[submission.userId],
          guessedUser: vote.userGuessObject,
          isCorrect: vote.userGuessId === submission.userId,
          round,
        });
      }
    });

    round.submissions.forEach((submission) => {
      const notes = round.votes
        .filter((vote) => vote.submissionId === submission._id && vote.note)
        .map((vote) => ({
          text: vote.note!,
          user: usersById[vote.userId],
        }));

      userData[submission.userId].submissions.push({
        submission,
        timeToSubmit: submission.submissionDate - round.submissionStartDate,
        user: usersById[submission.userId],
        notes,
      });
    });

    const usersByPoints = league.users
      .map((user) => {
        const userPoints = userData[user._id].points.reduce(
          (acc, points) => {
            acc.points += points.points;
            return acc;
          },
          {
            points: 0,
            user: usersById[user._id],
          }
        );

        return userPoints;
      })
      .sort((a, b) => b.points - a.points);

    const userPlaces = getPlaces(usersByPoints.map((u) => u.points));
    usersByPoints.forEach((userPointData, index) => {
      userData[userPointData.user._id].places.push({
        place: userPlaces[index],
        round,
      });
    });
  });

  const yourInfo = userData[userId];

  // 2. User total points and places
  const pointsByUser = new Map<string, number>();
  completedRounds.forEach((round) => {
    round.votes.forEach((vote) => {
      const submission = round.submissions.find(
        (s) => s._id === vote.submissionId
      );
      if (submission) {
        const current = pointsByUser.get(submission.userId) || 0;
        pointsByUser.set(submission.userId, current + vote.points);
      }
    });
  });

  const userPoints = Object.values(userData).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return b.votes.length - a.votes.length;
  });
  const userPlaces = getPlaces(userPoints.map((u) => u.totalPoints));
  const userIndex = userPoints.findIndex((u) => u.user._id === userId);
  const userStats: LeaguePlaybackStats["userStats"] = {
    totalPoints: yourInfo.totalPoints,
    place: userPlaces[userIndex],
  };

  // 3. Biggest fans (per user)
  const { biggestFan, biggestCritic } = Object.values(
    yourInfo.pointsByFriends
  ).reduce(
    (acc, data) => {
      if (!data) {
        return acc;
      }

      if (!acc.biggestFan || data.points > acc.biggestFan.points) {
        acc.biggestFan = data;
      }

      if (!acc.biggestCritic || data.points < acc.biggestCritic.points) {
        acc.biggestCritic = data;
      }

      return acc;
    },
    {
      biggestFan: null as LeaguePlaybackStats["biggestFan"],
      biggestCritic: null as LeaguePlaybackStats["biggestFan"],
    }
  );

  const pointsGiven = new Map<
    string,
    {
      totalPoints: number;
      songs: Array<{
        trackInfo: TrackInfo;
        points: number;
        round: PopulatedRound;
      }>;
    }
  >();

  completedRounds.forEach((round) => {
    round.votes.forEach((vote) => {
      const submission = round.submissions.find(
        (s) => s._id === vote.submissionId
      );
      if (submission && submission.userId === userId && vote.points > 0) {
        const current = pointsGiven.get(vote.userId) || {
          totalPoints: 0,
          songs: [],
        };
        current.totalPoints += vote.points;
        current.songs.push({
          trackInfo: submission.trackInfo,
          points: vote.points,
          round,
        });
        pointsGiven.set(vote.userId, current);
      }
    });
  });

  // 5. User with most wins
  const winsByUser = new Map<string, number>();
  completedRounds.forEach((round) => {
    const submissionPoints = new Map<string, number>();
    round.votes.forEach((vote) => {
      const current = submissionPoints.get(vote.submissionId) || 0;
      submissionPoints.set(vote.submissionId, current + vote.points);
    });

    if (submissionPoints.size === 0) {
      return;
    }

    const submissionIds = round.submissions.map((s) => s._id);
    const points = submissionIds.map((id) => submissionPoints.get(id) || 0);
    const places = getPlaces(points);

    submissionIds.forEach((submissionId, index) => {
      if (places[index] === 1) {
        const submission = round.submissions.find(
          (s) => s._id === submissionId
        );
        if (submission) {
          const current = winsByUser.get(submission.userId) || 0;
          winsByUser.set(submission.userId, current + 1);
        }
      }
    });
  });

  const {
    mostWinsUser,
    topSong,
    fastestSubmitter,
    slowestSubmitter,
    fastestVoter,
    slowestVoter,
    bestGuesser,
    worstGuesser,
    mostNotedSong,
  } = Object.values(userData).reduce(
    (acc, data) => {
      // mostWinsUser
      (() => {
        const userWins = data.places.filter((p) => p.place === 1).length;
        const userObj = { user: data.user, wins: userWins };
        if (!acc.mostWinsUser) {
          acc.mostWinsUser = userObj;
        }
        if (userWins > acc.mostWinsUser.wins) {
          acc.mostWinsUser = userObj;
        }
        if (userWins === acc.mostWinsUser.wins) {
          if (
            data.totalPoints > userData[acc.mostWinsUser.user._id].totalPoints
          ) {
            acc.mostWinsUser = userObj;
          }
        }
      })();

      // topSong
      (() => {
        if (!data.topSong) {
          return;
        }
        if (!acc.topSong || data.topSong.points > acc.topSong.points) {
          acc.topSong = data.topSong;
        }

        if (acc.topSong.points === data.topSong.points) {
          if (data.topSong.voters > acc.topSong.voters) {
            acc.topSong = data.topSong;
          }
        }
      })();

      // slowestSubmitter, fastestSubmitter
      (() => {
        const averageSubmitTime =
          data.submissions.reduce(
            (acc, submission) => acc + submission.timeToSubmit,
            0
          ) / data.submissions.length;

        if (
          !acc.slowestSubmitter ||
          averageSubmitTime > acc.slowestSubmitter.avgTime
        ) {
          acc.slowestSubmitter = {
            user: data.user,
            avgTime: averageSubmitTime,
          };
        }

        if (
          !acc.fastestSubmitter ||
          averageSubmitTime < acc.fastestSubmitter.avgTime
        ) {
          const fastestSubmission = data.submissions.reduce(
            (fastest, current) =>
              current.timeToSubmit < fastest.timeToSubmit ? current : fastest
          );
          acc.fastestSubmitter = {
            user: data.user,
            avgTime: averageSubmitTime,
            fastestSong: {
              round: roundsById[fastestSubmission.submission.roundId],
              time: fastestSubmission.timeToSubmit,
              trackInfo: fastestSubmission.submission.trackInfo,
            },
          };
        }
      })();

      // slowestVoter, fastestVoter
      (() => {
        const averageVoteTime =
          data.votes.reduce((acc, vote) => acc + vote.timeToVote, 0) /
          data.votes.length;

        if (!acc.slowestVoter || averageVoteTime > acc.slowestVoter.avgTime) {
          acc.slowestVoter = {
            user: data.user,
            avgTime: averageVoteTime,
          };
        }

        if (!acc.fastestVoter || averageVoteTime < acc.fastestVoter.avgTime) {
          const fastestSubmission = data.submissions.reduce(
            (fastest, current) =>
              current.timeToSubmit < fastest.timeToSubmit ? current : fastest
          );
          acc.fastestVoter = {
            user: data.user,
            avgTime: averageVoteTime,
            fastestSong: {
              round: roundsById[fastestSubmission.submission.roundId],
              time: fastestSubmission.timeToSubmit,
              trackInfo: fastestSubmission.submission.trackInfo,
            },
          };
        }
      })();

      // bestGuesser, worstGuesser
      (() => {
        const guessAccuracy =
          data.guesses.length === 0
            ? undefined
            : data.guesses.reduce(
                (acc, guess) => acc + (guess.isCorrect ? 1 : 0),
                0
              ) / data.guesses.length;

        if (
          guessAccuracy !== undefined &&
          (!acc.bestGuesser || guessAccuracy > acc.bestGuesser.accuracy)
        ) {
          acc.bestGuesser = {
            user: data.user,
            accuracy: guessAccuracy,
            guesses: data.guesses,
          };
        }

        if (
          guessAccuracy !== undefined &&
          (!acc.worstGuesser || guessAccuracy < acc.worstGuesser.accuracy)
        ) {
          acc.worstGuesser = {
            user: data.user,
            accuracy: guessAccuracy,
            guesses: data.guesses,
          };
        }
      })();

      // mostNotedSong
      (() => {
        data.submissions.forEach((submissionData) => {
          if (submissionData.notes.length === 0) {
            return;
          }

          if (
            !acc.mostNotedSong ||
            submissionData.notes.length > acc.mostNotedSong.notes.length
          ) {
            acc.mostNotedSong = {
              trackInfo: submissionData.submission.trackInfo,
              user: usersById[submissionData.submission.userId],
              notes: submissionData.notes.map((note) => ({
                text: note.text,
                user: usersById[note.user._id],
              })),
            };
          }
        });
      })();

      return acc;
    },
    {
      mostWinsUser: null as LeaguePlaybackStats["mostWinsUser"],
      topSong: null as LeaguePlaybackStats["topSong"],
      fastestSubmitter: null as LeaguePlaybackStats["fastestSubmitter"],
      slowestSubmitter: null as LeaguePlaybackStats["slowestSubmitter"],
      fastestVoter: null as LeaguePlaybackStats["fastestVoter"],
      slowestVoter: null as LeaguePlaybackStats["slowestVoter"],
      bestGuesser: null as LeaguePlaybackStats["bestGuesser"],
      worstGuesser: null as LeaguePlaybackStats["worstGuesser"],
      mostNotedSong: null as LeaguePlaybackStats["mostNotedSong"],
    }
  );

  // 8-9. Voting timing
  const votingTiming = new Map<
    string,
    {
      totalTime: number;
      count: number;
      votes: Array<{
        trackInfo: TrackInfo;
        time: number;
        round: PopulatedRound;
      }>;
    }
  >();
  completedRounds.forEach((round) => {
    const votesByUser = new Map<
      string,
      { voteDate: number; submissionId: string }
    >();

    round.votes.forEach((vote) => {
      const currentEarliest = votesByUser.get(vote.userId);
      if (!currentEarliest || vote.voteDate < currentEarliest.voteDate) {
        votesByUser.set(vote.userId, {
          voteDate: vote.voteDate,
          submissionId: vote.submissionId,
        });
      }
    });

    votesByUser.forEach((voteData, userId) => {
      const timeToVote = voteData.voteDate - round.votingStartDate;
      if (timeToVote < 0) {
        return;
      }

      const submission = round.submissions.find(
        (s) => s._id === voteData.submissionId
      );
      if (!submission) {
        return;
      }

      const current = votingTiming.get(userId) || {
        totalTime: 0,
        count: 0,
        votes: [],
      };
      current.votes.push({
        trackInfo: submission.trackInfo,
        time: timeToVote,
        round,
      });
      votingTiming.set(userId, {
        totalTime: current.totalTime + timeToVote,
        count: current.count + 1,
        votes: current.votes,
      });
    });
  });

  // 10. Most consistent
  const pointsByUserByRound = new Map<
    string,
    { points: number[]; totalPoints: number }
  >();
  completedRounds.forEach((round) => {
    const submissionPoints = new Map<string, number>();
    round.votes.forEach((vote) => {
      const current = submissionPoints.get(vote.submissionId) || 0;
      submissionPoints.set(vote.submissionId, current + vote.points);
    });

    round.submissions.forEach((submission) => {
      const points = submissionPoints.get(submission._id) || 0;
      const current = pointsByUserByRound.get(submission.userId) || {
        points: [],
        totalPoints: 0,
      };
      current.points.push(points);
      current.totalPoints += points;
      pointsByUserByRound.set(submission.userId, current);
    });
  });

  let mostConsistent: LeaguePlaybackStats["mostConsistent"] = null;
  pointsByUserByRound.forEach((data, userId) => {
    if (data.points.length < 2) {
      return;
    }

    const mean = data.totalPoints / data.points.length;
    const variance =
      data.points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
      data.points.length;

    if (!mostConsistent || variance < mostConsistent.variance) {
      const place = userStats?.place || 0;
      mostConsistent = {
        user: usersById[userId],
        variance,
        avgPoints: mean,
        place,
      };
    }
  });

  // 11. Conspirators
  const mutualPoints = new Map<string, number>();
  completedRounds.forEach((round) => {
    round.votes.forEach((vote) => {
      const submission = round.submissions.find(
        (s) => s._id === vote.submissionId
      );
      if (!submission) {
        return;
      }

      const voterId = vote.userId;
      const receiverId = submission.userId;

      if (voterId === receiverId) {
        return;
      }

      const pairKey =
        voterId < receiverId
          ? `${voterId}:${receiverId}`
          : `${receiverId}:${voterId}`;
      const current = mutualPoints.get(pairKey) || 0;
      mutualPoints.set(pairKey, current + vote.points);
    });
  });

  let conspirators: LeaguePlaybackStats["conspirators"] = null;
  mutualPoints.forEach((points, pairKey) => {
    if (!conspirators || points > conspirators.totalPoints) {
      const [userId1, userId2] = pairKey.split(":");
      conspirators = { userId1, userId2, totalPoints: points };
    }
  });

  // 12. User top song (highest scoring submission per user)
  const userTopSong: LeaguePlaybackStats["userTopSong"] = yourInfo.topSong;

  // 13. Best and worst guessers (vote accuracy)
  // Calculate how well each user's votes predicted final rankings
  const guesserAccuracy = new Map<
    string,
    {
      correctCount: number;
      incorrectCount: number;
      accuracy: number;
      guesses: Array<{
        trackInfo: TrackInfo;
        submitter: PopulatedUser;
        guessedUser: PopulatedUser;
        isCorrect: boolean;
        round: PopulatedRound;
      }>;
    }
  >();

  completedRounds.forEach((round) => {
    round.votes.forEach((vote) => {
      if (vote.userGuessObject) {
        const current = guesserAccuracy.get(vote.userId) || {
          correctCount: 0,
          incorrectCount: 0,
          accuracy: 0,
          guesses: [],
        };
        const submission = round.submissions.find(
          (submission) => submission._id === vote.submissionId
        );
        if (!submission) {
          return;
        }

        const isCorrect = vote.userGuessObject._id === submission.userId;

        // Add this guess to the list
        current.guesses.push({
          trackInfo: submission.trackInfo,
          submitter: usersById[submission.userId],
          guessedUser: usersById[vote.userGuessObject._id],
          isCorrect,
          round,
        });

        if (isCorrect) {
          current.correctCount += 1;
        } else {
          current.incorrectCount += 1;
        }
        const totalGuesses = current.correctCount + current.incorrectCount;
        current.accuracy =
          totalGuesses > 0 ? current.correctCount / totalGuesses : 0;
        guesserAccuracy.set(vote.userId, current);
      }
    });
  });

  // 14. Song with most notes
  const notesBySubmission = new Map<
    string,
    {
      trackInfo: TrackInfo;
      userId: string;
      notes: Array<{ text: string; userId: string }>;
    }
  >();

  completedRounds.forEach((round) => {
    round.submissions.forEach((submission) => {
      if (!notesBySubmission.has(submission._id)) {
        notesBySubmission.set(submission._id, {
          trackInfo: submission.trackInfo,
          userId: submission.userId,
          notes: [],
        });
      }

      const submissionData = notesBySubmission.get(submission._id)!;

      // Add submission note if it exists
      if (submission.note && submission.note.trim()) {
        submissionData.notes.push({
          text: submission.note,
          userId: submission.userId,
        });
      }
    });

    // Add vote notes
    round.votes.forEach((vote) => {
      const submission = notesBySubmission.get(vote.submissionId);
      if (submission && vote.note && vote.note.trim()) {
        submission.notes.push({
          text: vote.note,
          userId: vote.userId,
        });
      }
    });
  });

  const allUserTopSongs: LeaguePlaybackStats["allUserTopSongs"] = Object.values(
    userData
  )
    .map((data) => {
      if (!data.topSong) {
        return null;
      }
      return {
        user: data.user,
        trackInfo: data.topSong.trackInfo,
        points: data.topSong.points,
        voters: data.topSong.voters,
        round: data.topSong.round,
      };
    })
    .filter((song) => song !== null);

  const allUserWins: LeaguePlaybackStats["allUserWins"] = Object.values(
    userData
  )
    .map((data) => {
      const wins = data.places.filter((p) => p.place === 1).length;
      return {
        user: data.user,
        wins,
        totalPoints: data.totalPoints,
      };
    })
    .sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      return b.totalPoints - a.totalPoints;
    });

  return {
    topSong,
    userStats,
    biggestFan,
    biggestCritic,
    mostWinsUser,
    fastestSubmitter,
    slowestSubmitter,
    fastestVoter,
    slowestVoter,
    mostConsistent,
    conspirators,
    userTopSong,
    bestGuesser,
    worstGuesser,
    mostNotedSong,
    allUserTopSongs,
    allUserWins,
  };
}
