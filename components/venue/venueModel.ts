import type {
  PopulatedLeague,
  PopulatedRound,
  PopulatedSubmission,
  PopulatedUser,
} from '@/lib/types';
import { getPlaces } from '@/lib/utils/getPlaces';
import { getAllRounds } from '@/lib/utils/getAllRounds';
import type { StationId } from './stations';

/**
 * Everything the venue needs to know about the league, derived once from the
 * populated league. Pure, so the scene and the HUD agree on what's going on.
 */

export type FriendState = {
  user: PopulatedUser;
  isYou: boolean;
  // whether they've done the thing the current round is waiting on
  isDone: boolean;
  // what we say when you tap them
  status: string;
  place: number | null;
  points: number;
};

export type Standing = {
  user: PopulatedUser;
  points: number;
  wins: number;
  place: number;
};

export type Quest = {
  station: StationId;
  title: string;
  detail: string;
  // whether this is something only you can do (pulses louder)
  urgent: boolean;
};

export type StageTheme = {
  label: string;
  // neon color for the whole room's mood lighting
  color: string;
};

export type VenueModel = {
  currentRound: PopulatedRound | undefined;
  allRounds: PopulatedRound[];
  completedRounds: PopulatedRound[];
  standings: Standing[];
  friends: FriendState[];
  quest: Quest | null;
  theme: StageTheme;
  userHasCreatedRound: boolean;
  canCreateKickoff: boolean;
  canCreateBonus: boolean;
  // album art for the record on the DJ booth's turntable
  spinningTrackArt: string | null;
};

export function getStageTheme(round: PopulatedRound | undefined): StageTheme {
  switch (round?.stage) {
    case 'submission':
      return { label: 'Submissions open', color: '#38e1ff' };
    case 'voting':
      return { label: 'Voting open', color: '#ffb547' };
    case 'currentUserVotingCompleted':
      return { label: 'Votes coming in', color: '#ffb547' };
    case 'completed':
      return { label: 'Round complete', color: '#7dff9b' };
    case 'upcoming':
      return { label: 'Up next', color: '#b78cff' };
    default:
      return { label: 'Intermission', color: '#b78cff' };
  }
}

export function getRoundPoints(round: PopulatedRound) {
  const submissionsById = new Map<string, PopulatedSubmission>(
    round.submissions.map((submission) => [submission._id, submission]),
  );
  const pointsByUser = new Map<string, number>();
  for (const vote of round.votes) {
    const submission = submissionsById.get(vote.submissionId);
    if (!submission) {
      continue;
    }
    pointsByUser.set(
      submission.userId,
      (pointsByUser.get(submission.userId) ?? 0) + vote.points,
    );
  }
  return pointsByUser;
}

/** Submissions of a completed round with their totals, best first. */
export function getRoundResults(round: PopulatedRound) {
  const entries = round.submissions.map((submission) => {
    const votes = round.votes.filter(
      (vote) => vote.submissionId === submission._id && vote.points > 0,
    );
    return {
      submission,
      user: submission.userObject!,
      points: votes.reduce((sum, vote) => sum + vote.points, 0),
      votes,
      wins: 0,
    };
  });
  return getPlaces(entries.filter((entry) => entry.user));
}

export function getStandings(league: PopulatedLeague): Standing[] {
  const totals = new Map(
    league.users.map((user) => [user._id, { user, points: 0, wins: 0 }]),
  );
  for (const round of league.rounds.completed) {
    const points = getRoundPoints(round);
    const best = Math.max(0, ...Array.from(points.values()));
    for (const [userId, roundPoints] of Array.from(points.entries())) {
      const entry = totals.get(userId);
      if (!entry) {
        continue;
      }
      entry.points += roundPoints;
      if (best > 0 && roundPoints === best) {
        entry.wins += 1;
      }
    }
  }
  return getPlaces(Array.from(totals.values()));
}

export function userHasVoted(
  round: PopulatedRound,
  userId: string,
  votesPerRound: number,
) {
  const used = round.votes
    .filter((vote) => vote.userId === userId)
    .reduce((sum, vote) => sum + vote.points, 0);
  return used >= votesPerRound;
}

export function buildVenueModel(
  league: PopulatedLeague,
  me: PopulatedUser,
): VenueModel {
  const currentRound = league.rounds.current;
  const allRounds = getAllRounds(league);
  const standings = getStandings(league);
  const standingByUser = new Map(standings.map((s) => [s.user._id, s]));
  const anyPoints = standings.some((s) => s.points > 0);

  const realRounds = getAllRounds(league, { includeFake: false });
  const mine = realRounds.filter((round) => round.creatorId === me._id);
  const userHasCreatedRound = mine.some(
    (round) => !round.isBonusRound && !round.isKickoffRound,
  );
  const canCreateKickoff =
    league.kickoffRoundUserIds.includes(me._id) &&
    !mine.some((round) => round.isKickoffRound);
  const canCreateBonus =
    league.bonusRoundUserIds.includes(me._id) &&
    !mine.some((round) => round.isBonusRound);

  const friends: FriendState[] = league.users.map((user) => {
    const standing = standingByUser.get(user._id);
    const isYou = user._id === me._id;
    const name = isYou ? 'You' : user.firstName || user.userName;
    const { isDone, status } = (() => {
      switch (currentRound?.stage) {
        case 'submission': {
          if (!currentRound._id) {
            return {
              isDone: false,
              status: `Waiting on ${currentRound.creatorObject.userName} to set the theme`,
            };
          }
          const submitted = currentRound.submissions.some(
            (s) => s.userId === user._id,
          );
          return {
            isDone: submitted,
            status: submitted
              ? `${name} ${isYou ? 'have' : 'has'} submitted a song`
              : `${name} ${isYou ? "haven't" : "hasn't"} submitted yet`,
          };
        }
        case 'voting':
        case 'currentUserVotingCompleted': {
          const voted = userHasVoted(
            currentRound,
            user._id,
            league.votesPerRound,
          );
          return {
            isDone: voted,
            status: voted
              ? `${name} ${isYou ? 'have' : 'has'} voted`
              : `${name} ${isYou ? "haven't" : "hasn't"} voted yet`,
          };
        }
        default:
          return { isDone: true, status: `${name} ${isYou ? 'are' : 'is'} vibing` };
      }
    })();
    return {
      user,
      isYou,
      isDone,
      status,
      place: anyPoints ? (standing?.place ?? null) : null,
      points: standing?.points ?? 0,
    };
  });

  const quest = ((): Quest | null => {
    if (!userHasCreatedRound && league.status !== 'completed') {
      return {
        station: 'stage',
        title: 'Write your round',
        detail: 'Pick a theme for everyone',
        urgent: true,
      };
    }
    switch (currentRound?.stage) {
      case 'submission': {
        if (!currentRound._id) {
          return {
            station: 'stage',
            title: 'Waiting on a theme',
            detail: `${currentRound.creatorObject.userName} is writing it`,
            urgent: false,
          };
        }
        if (!currentRound.userSubmission) {
          return {
            station: 'booth',
            title: 'Drop your track',
            detail: currentRound.title,
            urgent: true,
          };
        }
        return {
          station: 'booth',
          title: 'Your song is in',
          detail: 'Swap it until the deadline',
          urgent: false,
        };
      }
      case 'voting':
        return {
          station: 'ballot',
          title: 'Cast your votes',
          detail: `${league.votesPerRound} chips to spend`,
          urgent: true,
        };
      case 'currentUserVotingCompleted':
        return {
          station: 'ballot',
          title: 'Votes are in',
          detail: 'Waiting on the others',
          urgent: false,
        };
      default:
        break;
    }
    if (league.playback) {
      return {
        station: 'jukebox',
        title: 'League recap is ready',
        detail: 'Hit the jukebox',
        urgent: false,
      };
    }
    if (league.rounds.completed.length > 0) {
      return {
        station: 'crates',
        title: 'Dig through the crates',
        detail: 'Past round results',
        urgent: false,
      };
    }
    return null;
  })();

  const spinningTrackArt =
    currentRound?.userSubmission?.trackInfo.albumImageUrl ??
    league.rounds.completed
      .flatMap((round) => getRoundResults(round).slice(0, 1))
      .at(0)?.submission.trackInfo.albumImageUrl ??
    null;

  return {
    currentRound,
    allRounds,
    completedRounds: league.rounds.completed,
    standings,
    friends,
    quest,
    theme: getStageTheme(currentRound),
    userHasCreatedRound,
    canCreateKickoff,
    canCreateBonus,
    spinningTrackArt,
  };
}
