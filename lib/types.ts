import type {
  League,
  OnDeckSongSubmission,
  Round,
  SongSubmission,
  User,
  Vote,
  TrackInfo,
} from '../databaseTypes';

type WithStringId<T> = Omit<T, '_id'> & { _id: string };

export type PopulatedUser = WithStringId<User> & {
  index: number;
};
export type PopulatedSubmission = WithStringId<SongSubmission> & {
  userObject: PopulatedUser | undefined;
  guesses: Array<{
    guesser: PopulatedUser;
    guessee: PopulatedUser;
  }> | null;
};
export type PopulatedOnDeckSubmission = WithStringId<OnDeckSongSubmission> & {
  userObject: PopulatedUser | undefined;
};
export type PopulatedVote = WithStringId<Vote> & {
  userObject: PopulatedUser;
  userGuessObject: PopulatedUser | undefined;
};
export type PopulatedTrackInfo = PopulatedSubmission['trackInfo'];

export type PopulatedRoundStage =
  | 'upcoming'
  | 'completed'
  | 'voting'
  | 'currentUserVotingCompleted'
  | 'submission'
  | 'unknown';

export type PopulatedRound = Omit<
  WithStringId<Round>,
  | 'submissionStartDate'
  | 'submissionEndDate'
  | 'votingStartDate'
  | 'votingEndDate'
> & {
  roundIndex: number;
  submissionStartDate: number;
  submissionEndDate: number;
  votingStartDate: number;
  votingEndDate: number;
  stage: PopulatedRoundStage;

  votes: PopulatedVote[];
  submissions: PopulatedSubmission[];
  onDeckSubmissions: PopulatedOnDeckSubmission[];
  userSubmission: PopulatedSubmission | undefined;
  creatorObject: PopulatedUser;
  isPending?: boolean;
  isHidden: boolean;

  previousRound: Pick<
    PopulatedRound,
    '_id' | 'title' | 'isHidden' | 'isPending' | 'roundIndex'
  > | null;
  nextRound: Pick<
    PopulatedRound,
    '_id' | 'title' | 'isHidden' | 'isPending' | 'roundIndex'
  > | null;
};

export interface LeaguePlaybackStats {
  topSong: {
    trackInfo: TrackInfo;
    points: number;
    voters: number;
    user: PopulatedUser;
    votes: PopulatedVote[];
  } | null;
  userStats: {
    totalPoints: number;
    place: number;
  } | null;
  biggestFan: {
    user: PopulatedUser;
    points: number;
    votes: number;
    songs: Array<{
      trackInfo: TrackInfo;
      points: number;
      round: PopulatedRound;
      note: string | undefined;
    }>;
  } | null;
  biggestStan: {
    user: PopulatedUser;
    points: number;
    votes: number;
    songs: Array<{
      trackInfo: TrackInfo;
      points: number;
      round: PopulatedRound;
      note: string | undefined;
    }>;
  } | null;
  biggestCritic: {
    user: PopulatedUser;
    points: number;
    songs: Array<{
      trackInfo: TrackInfo;
      points: number;
      round: PopulatedRound;
      note: string | undefined;
    }>;
  } | null;
  hardestSell: {
    user: PopulatedUser;
    points: number;
    songs: Array<{
      trackInfo: TrackInfo;
      points: number;
      round: PopulatedRound;
      note: string | undefined;
    }>;
  } | null;
  mostWinsUsers: Array<{
    user: PopulatedUser;
    wins: Array<{
      trackInfo: TrackInfo;
      points: number;
      round: PopulatedRound;
      note: string | undefined;
    }>;
  }>;
  fastestSubmitters: Array<{
    user: PopulatedUser;
    avgTime: number;
    fastestSongs: Array<{
      trackInfo: TrackInfo;
      time: number;
      round: PopulatedRound;
      note: string | undefined;
    }>;
    submissions: Array<{
      trackInfo: TrackInfo;
      time: number;
      round: PopulatedRound;
      note: string | undefined;
    }>;
  }>;
  scrappyWin: {
    points: number;
    voters: number;
    user: PopulatedUser;
    round: PopulatedRound;
  } | null;
  fastestSubmission: {
    user: PopulatedUser;
    time: number;
    trackInfo: TrackInfo;
    round: PopulatedRound;
  } | null;
  fastestVoters: Array<{
    user: PopulatedUser;
    avgTime: number;
    votes: Array<{
      time: number;
      round: PopulatedRound;
    }>;
    rounds: Array<{
      round: PopulatedRound;
      time: number;
    }>;
  }>;
  fastestVote: {
    user: PopulatedUser;
    time: number;
    round: PopulatedRound;
  } | null;
  slowestVoter: { user: PopulatedUser; avgTime: number } | null;
  mostConsistent: Array<{
    user: PopulatedUser;
    variance: number;
    avgPoints: number;
    rounds: Array<{
      round: PopulatedRound;
      points: number;
      submission: PopulatedSubmission;
    }>;
  }>;
  conspirators: Array<{
    user1: PopulatedUser;
    user2: PopulatedUser;
    user1Points: number;
    user2Points: number;
    totalPoints: number;
  }>;
  userTopSong: {
    trackInfo: TrackInfo;
    points: number;
    user: PopulatedUser;
    votes: PopulatedVote[];
  } | null;
  bestGuessers: Array<{
    user: PopulatedUser;
    accuracy: number;
    guesses: Array<{
      trackInfo: TrackInfo;
      submitter: PopulatedUser;
      guessedUser: PopulatedUser;
      isCorrect: boolean;
      round: PopulatedRound;
    }>;
  }>;
  mostNotedSongs: Array<{
    trackInfo: TrackInfo;
    user: PopulatedUser;
    points: number;
    round: PopulatedRound;
    notes: Array<{
      text: string;
      user: PopulatedUser;
    }>;
  }>;
  allUserTopSongs: Array<{
    user: PopulatedUser;
    trackInfo: TrackInfo;
    points: number;
    voters: number;
    votes: PopulatedVote[];
    round: PopulatedRound;
  }>;
  crowdPleaser: {
    user: PopulatedUser;
    trackInfo: TrackInfo;
    points: number;
    voters: number;
    votes: PopulatedVote[];
    round: PopulatedRound;
  } | null;
  allUserWins: Array<{
    user: PopulatedUser;
    wins: number;
    totalPoints: number;
  }>;
  leagueWinner: {
    user: PopulatedUser;
    totalPoints: number;
    firstPlaceRounds: number;
    submissions: Array<{
      trackInfo: TrackInfo;
      round: PopulatedRound;
      points: number;
      votes: Array<{
        user: PopulatedUser;
        points: number;
        note?: string;
      }>;
    }>;
  } | null;
  otherUsers: Array<{
    user: PopulatedUser;
    totalPoints: number;
  }>;
  roundPoints: Array<{
    round: PopulatedRound;
    users: Array<{
      user: PopulatedUser;
      points: number;
      wins: number;
    }>;
  }>;
}

export type PopulatedLeague = WithStringId<Omit<League, 'users'>> & {
  status: 'active' | 'completed' | 'upcoming' | 'pending' | 'unknown';
  numberOfRounds: number;
  users: PopulatedUser[];
  rounds: {
    current: PopulatedRound | undefined;
    completed: PopulatedRound[];
    upcoming: PopulatedRound[];
    bonus: PopulatedRound[];
    kickoff: PopulatedRound[];
  };
  playback: LeaguePlaybackStats | null;
};
