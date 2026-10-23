import type {
  PopulatedLeague,
  PopulatedRound,
  PopulatedSubmission,
  PopulatedUser,
} from '@/lib/types';
import { getPlaces } from '@/lib/utils/getPlaces';
import { getRoundResults } from '../../venueModel';

export type SetListEntry = {
  round: PopulatedRound;
  // undefined when the act sat this round out
  submission: PopulatedSubmission | undefined;
  points: number;
  place: number | null;
};

export function sortCompleted(league: PopulatedLeague) {
  return [...league.rounds.completed].sort(
    (a, b) => a.submissionStartDate - b.submissionStartDate,
  );
}

/** userId -> one entry per completed round, in round order. */
export function buildSetLists(rounds: PopulatedRound[]) {
  const byUser = new Map<string, SetListEntry[]>();
  for (const round of rounds) {
    for (const result of getRoundResults(round)) {
      const list = byUser.get(result.user._id) ?? [];
      list.push({
        round,
        submission: result.submission,
        points: result.points,
        place: result.place,
      });
      byUser.set(result.user._id, list);
    }
  }
  return byUser;
}

/** Each user's standing place after each completed round (for the bump chart). */
export function buildBump(league: PopulatedLeague, rounds: PopulatedRound[]) {
  const totals = new Map(
    league.users.map((user) => [user._id, { user, points: 0, wins: 0 }]),
  );
  const placesByUser = new Map<string, number[]>(
    league.users.map((user) => [user._id, []]),
  );
  for (const round of rounds) {
    const results = getRoundResults(round);
    const best = Math.max(0, ...results.map((result) => result.points));
    for (const result of results) {
      const total = totals.get(result.user._id);
      if (!total) {
        continue;
      }
      total.points += result.points;
      if (best > 0 && result.points === best) {
        total.wins += 1;
      }
    }
    for (const entry of getPlaces(Array.from(totals.values()))) {
      placesByUser.get(entry.user._id)?.push(entry.place);
    }
  }
  return placesByUser;
}

export type GuessStat = {
  user: PopulatedUser;
  correctCount: number;
  incorrectCount: number;
  totalGuesses: number;
  accuracy: number;
  guesses: Array<{
    round: PopulatedRound;
    submission: PopulatedSubmission;
    guessedUser: PopulatedUser;
    actualUser: PopulatedUser;
    isCorrect: boolean;
  }>;
};

export function buildGuessStats(league: PopulatedLeague): GuessStat[] {
  const usersById = new Map(league.users.map((user) => [user._id, user]));
  const stats = league.users.map((user) => {
    const guesses: GuessStat['guesses'] = [];
    for (const round of league.rounds.completed) {
      const submissionsById = new Map(
        round.submissions.map((submission) => [submission._id, submission]),
      );
      for (const vote of round.votes) {
        if (vote.userId !== user._id || !vote.userGuessId) {
          continue;
        }
        const submission = submissionsById.get(vote.submissionId);
        if (!submission) {
          continue;
        }
        const guessedUser = usersById.get(vote.userGuessId);
        const actualUser = usersById.get(submission.userId);
        if (guessedUser && actualUser) {
          guesses.push({
            round,
            submission,
            guessedUser,
            actualUser,
            isCorrect: vote.userGuessId === submission.userId,
          });
        }
      }
    }
    const correctCount = guesses.filter((guess) => guess.isCorrect).length;
    const totalGuesses = guesses.length;
    return {
      user,
      guesses,
      correctCount,
      incorrectCount: totalGuesses - correctCount,
      totalGuesses,
      accuracy: totalGuesses > 0 ? (correctCount / totalGuesses) * 100 : 0,
    };
  });
  return stats
    .filter((stat) => stat.totalGuesses > 0)
    .sort((a, b) => {
      if (b.accuracy !== a.accuracy) {
        return b.accuracy - a.accuracy;
      }
      if (b.correctCount !== a.correctCount) {
        return b.correctCount - a.correctCount;
      }
      return a.incorrectCount - b.incorrectCount;
    });
}

/** Who gave the current user the most / fewest points across the league. */
export function buildFanAndCritic(
  league: PopulatedLeague,
  me: PopulatedUser,
) {
  const totals = new Map(
    league.users.map((user) => [user._id, { user, points: 0, votes: 0 }]),
  );
  for (const round of league.rounds.completed) {
    const submissionsById = new Map(
      round.submissions.map((submission) => [submission._id, submission]),
    );
    for (const vote of round.votes) {
      const submission = submissionsById.get(vote.submissionId);
      const total = totals.get(vote.userId);
      if (!submission || submission.userId !== me._id || !total) {
        continue;
      }
      total.points += vote.points;
      total.votes += 1;
    }
  }
  const sorted = Array.from(totals.values())
    .filter((item) => item.user._id !== me._id)
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      return a.user.index - b.user.index;
    });
  return { fan: sorted[0], critic: sorted[sorted.length - 1] };
}
