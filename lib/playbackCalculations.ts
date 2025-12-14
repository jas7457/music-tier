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
      biggestStan: null,
      biggestCritic: null,
      hardestSell: null,
      mostWinsUsers: [],
      fastestSubmitters: [],
      fastestSubmission: null,
      fastestVoters: [],
      fastestVote: null,
      slowestVoter: null,
      mostConsistent: [],
      conspirators: [],
      userTopSong: null,
      bestGuessers: [],
      mostNotedSongs: [],
      allUserTopSongs: [],
      allUserWins: [],
    };
  }

  const userData = league.users.reduce(
    (acc, user) => {
      const createEmpty = () => {
        return league.users.reduce((acc, user) => {
          if (user._id === userId) {
            return acc;
          }
          acc[user._id] = { points: 0, votes: 0, songs: [], user };
          return acc;
        }, {} as Record<string, LeaguePlaybackStats["biggestFan"]>);
      };

      acc[user._id] = {
        user,
        places: [],
        points: [],
        submissions: [],
        votes: [],
        pointsByFriends: createEmpty(),
        pointsForFriends: createEmpty(),
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
        pointsForFriends: Record<string, LeaguePlaybackStats["biggestStan"]>;
        guesses: NonNullable<
          LeaguePlaybackStats["bestGuessers"]
        >[number]["guesses"];
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
          votes: 0,
          songs: [],
          user: usersById[vote.userId],
        };

        pointsByFriend.points += vote.points;
        pointsByFriend.votes += 1;
        pointsByFriend.songs.push({
          trackInfo: submission.trackInfo,
          points: vote.points,
          round,
        });
        submissionUser.pointsByFriends[vote.userId] = pointsByFriend;

        const pointsForFriend = voteUser.pointsForFriends[
          submissionUser.user._id
        ] ?? {
          points: 0,
          votes: 0,
          songs: [],
          user: usersById[submissionUser.user._id],
        };
        pointsForFriend.points += vote.points;
        pointsForFriend.votes += 1;
        pointsForFriend.songs.push({
          trackInfo: submission.trackInfo,
          points: vote.points,
          round,
        });
        voteUser.pointsForFriends[submissionUser.user._id] = pointsForFriend;
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
        const votesForUser = round.votes.filter((vote) => {
          const submission = round.submissions.find(
            (s) => s._id === vote.submissionId
          );
          return submission?.userId === user._id;
        });
        const userPoints = votesForUser.reduce(
          (acc, points) => {
            if (points.points > 0) {
              acc.points += points.points;
            }
            return acc;
          },
          {
            points: 0,
            user: usersById[user._id],
          }
        );

        return userPoints;
      })
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return a.user.index - b.user.index;
      });

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
  const fans = Object.values(yourInfo.pointsByFriends).sort((a, b) => {
    if (a === null || b === null) {
      return 0;
    }
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    if (b.votes !== a.votes) {
      return b.votes - a.votes;
    }
    return a.user.index - b.user.index;
  });
  const biggestFan = fans[0];
  const biggestCritic = fans[fans.length - 1];

  const yourLoves = Object.values(yourInfo.pointsForFriends).sort((a, b) => {
    if (a === null || b === null) {
      return 0;
    }
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    if (b.votes !== a.votes) {
      return b.votes - a.votes;
    }
    return a.user.index - b.user.index;
  });
  const biggestStan = yourLoves[0];
  const hardestSell = yourLoves[yourLoves.length - 1];

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
    mostWinsUsers,
    topSong,
    fastestSubmitters,
    fastestVoters,
    slowestVoter,
    bestGuessers,
    mostNotedSongs,
    fastestVote,
    fastestSubmission,
  } = Object.values(userData).reduce(
    (acc, data) => {
      // mostWinsUsers
      (() => {
        const winningRounds = data.places.filter((p) => p.place === 1);
        if (winningRounds.length === 0) {
          return;
        }
        const winningSubmissions = winningRounds
          .map((placeInfo) => {
            // Find the submission for this winning round
            const pointInfo = data.points.find(
              (p) => p.round._id === placeInfo.round._id
            );
            if (!pointInfo) {
              return null;
            }
            return {
              trackInfo: pointInfo!.trackInfo,
              points: pointInfo!.points,
              round: placeInfo.round,
            };
          })
          .filter((item) => item !== null);

        acc.mostWinsUsers.push({ user: data.user, wins: winningSubmissions });
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

      // fastestSubmitters
      (() => {
        const averageSubmitTime =
          data.submissions.reduce(
            (acc, submission) => acc + submission.timeToSubmit,
            0
          ) / data.submissions.length;

        const fastestSubmission = data.submissions.reduce(
          (fastest, current) => {
            if (!fastest) {
              return current;
            }
            return current.timeToSubmit < fastest.timeToSubmit
              ? current
              : fastest;
          },
          null as null | (typeof data.submissions)[number]
        );
        if (fastestSubmission) {
          acc.fastestSubmitters.push({
            user: data.user,
            avgTime: averageSubmitTime,
            fastestSong: {
              round: roundsById[fastestSubmission.submission.roundId],
              time: fastestSubmission.timeToSubmit,
              trackInfo: fastestSubmission.submission.trackInfo,
            },
          });

          if (
            !acc.fastestSubmission ||
            fastestSubmission.timeToSubmit < acc.fastestSubmission.time
          ) {
            acc.fastestSubmission = {
              user: data.user,
              time: fastestSubmission.timeToSubmit,
              trackInfo: fastestSubmission.submission.trackInfo,
              round: roundsById[fastestSubmission.submission.roundId],
            };
          }
        }
      })();

      // fastestVoters
      (() => {
        const averageVoteTime =
          data.votes.reduce((acc, vote) => acc + vote.timeToVote, 0) /
          data.votes.length;

        acc.fastestVoters.push({
          user: data.user,
          avgTime: averageVoteTime,
        });

        const fastestVote = [...data.votes].sort(
          (a, b) => a.timeToVote - b.timeToVote
        )[0];
        if (!fastestVote) {
          return;
        }
        const submission = submissionsById[fastestVote.vote.submissionId];

        if (!acc.fastestVote || fastestVote.timeToVote < acc.fastestVote.time) {
          acc.fastestVote = {
            user: data.user,
            time: fastestVote.timeToVote,
            round: roundsById[submission.roundId],
          };
        }
      })();

      // bestGuessers
      (() => {
        if (data.guesses.length === 0) {
          return;
        }
        const guessAccuracy =
          data.guesses.reduce(
            (acc, guess) => acc + (guess.isCorrect ? 1 : 0),
            0
          ) / data.guesses.length;

        acc.bestGuessers.push({
          user: data.user,
          accuracy: guessAccuracy,
          guesses: data.guesses,
        });
      })();

      // mostNotedSongs
      (() => {
        data.submissions.forEach((submissionData) => {
          if (submissionData.notes.length === 0) {
            return;
          }

          acc.mostNotedSongs.push({
            trackInfo: submissionData.submission.trackInfo,
            user: usersById[submissionData.submission.userId],
            points: data.points.reduce((acc, p) => acc + p.points, 0),
            round: roundsById[submissionData.submission.roundId],
            notes: submissionData.notes.map((note) => ({
              text: note.text,
              user: usersById[note.user._id],
            })),
          });
        });
      })();

      return acc;
    },
    {
      mostWinsUsers: [] as LeaguePlaybackStats["mostWinsUsers"],
      topSong: null as LeaguePlaybackStats["topSong"],
      fastestSubmitters: [] as LeaguePlaybackStats["fastestSubmitters"],
      fastestSubmission: null as LeaguePlaybackStats["fastestSubmission"],
      fastestVoters: [] as LeaguePlaybackStats["fastestVoters"],
      fastestVote: null as LeaguePlaybackStats["fastestVote"],
      slowestVoter: null as LeaguePlaybackStats["slowestVoter"],
      bestGuessers: [] as LeaguePlaybackStats["bestGuessers"],
      mostNotedSongs: [] as LeaguePlaybackStats["mostNotedSongs"],
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

  const mostConsistent: LeaguePlaybackStats["mostConsistent"] = Array.from(
    pointsByUserByRound.entries()
  )
    .filter(([, data]) => data.points.length >= 2)
    .map(([userId, data]) => {
      const mean = data.totalPoints / data.points.length;
      const variance =
        data.points.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
        data.points.length;
      const userPlace =
        userPoints.findIndex((u) => u.user._id === userId) !== -1
          ? userPlaces[userPoints.findIndex((u) => u.user._id === userId)]
          : 0;
      return {
        user: usersById[userId],
        variance,
        avgPoints: mean,
        place: userPlace,
      };
    })
    .sort((a, b) => a.variance - b.variance);

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
        submission.userObject &&
        vote.userObject &&
        submission.userObject.index < vote.userObject.index
          ? `${receiverId}:${voterId}`
          : `${voterId}:${receiverId}`;
      const current = mutualPoints.get(pairKey) || 0;
      mutualPoints.set(pairKey, current + vote.points);
    });
  });

  const conspirators: LeaguePlaybackStats["conspirators"] = Array.from(
    mutualPoints.entries()
  )
    .map(([pairKey, points]) => {
      const [userId1, userId2] = pairKey.split(":");
      return {
        userId1,
        userId2,
        totalPoints: points,
        user1: usersById[userId1],
        user2: usersById[userId2],
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

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
    .filter((song) => song !== null)
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.voters !== a.voters) {
        return b.voters - a.voters;
      }
      return a.user.index - b.user.index;
    });

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
    biggestStan,
    biggestCritic,
    hardestSell,
    mostWinsUsers: mostWinsUsers.sort((a, b) => {
      if (b.wins.length !== a.wins.length) {
        return b.wins.length - a.wins.length;
      }
      const aPoints = a.wins.reduce((acc, win) => acc + win.points, 0);
      const bPoints = b.wins.reduce((acc, win) => acc + win.points, 0);
      if (bPoints !== aPoints) {
        return bPoints - aPoints;
      }
      return (
        userData[b.user._id].totalPoints - userData[a.user._id].totalPoints
      );
    }),
    fastestSubmitters: fastestSubmitters.sort((a, b) => a.avgTime - b.avgTime),
    fastestSubmission,
    fastestVoters: fastestVoters.sort((a, b) => a.avgTime - b.avgTime),
    fastestVote,
    slowestVoter,
    mostConsistent,
    conspirators,
    userTopSong,
    bestGuessers: bestGuessers.sort((a, b) => b.accuracy - a.accuracy),
    mostNotedSongs: mostNotedSongs.sort((a, b) => {
      if (b.notes.length !== a.notes.length) {
        return b.notes.length - a.notes.length;
      }
      return b.points - a.points;
    }),
    allUserTopSongs,
    allUserWins,
  };
}
