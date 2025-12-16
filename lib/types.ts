import type {
  League,
  OnDeckSongSubmission,
  Round,
  SongSubmission,
  User,
  Vote,
  TrackInfo,
} from "../databaseTypes";

type WithStringId<T> = Omit<T, "_id"> & { _id: string };

export type PopulatedUser = WithStringId<User> & {
  index: number;
  canCreateBonusRound: boolean;
};
export type PopulatedSubmission = WithStringId<SongSubmission> & {
  userObject: PopulatedUser | undefined;
};
export type PopulatedOnDeckSubmission = WithStringId<OnDeckSongSubmission> & {
  userObject: PopulatedUser | undefined;
};
export type PopulatedVote = WithStringId<Vote> & {
  userObject: PopulatedUser;
  userGuessObject: PopulatedUser | undefined;
};
export type PopulatedTrackInfo = PopulatedSubmission["trackInfo"];

export type PopulatedRoundStage =
  | "upcoming"
  | "completed"
  | "voting"
  | "currentUserVotingCompleted"
  | "submission"
  | "unknown";

export type PopulatedRound = WithStringId<Round> & {
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
    }>;
  } | null;
  biggestCritic: {
    user: PopulatedUser;
    points: number;
    songs: Array<{
      trackInfo: TrackInfo;
      points: number;
      round: PopulatedRound;
    }>;
  } | null;
  hardestSell: {
    user: PopulatedUser;
    points: number;
    songs: Array<{
      trackInfo: TrackInfo;
      points: number;
      round: PopulatedRound;
    }>;
  } | null;
  mostWinsUsers: Array<{
    user: PopulatedUser;
    wins: Array<{
      trackInfo: TrackInfo;
      points: number;
      round: PopulatedRound;
    }>;
  }>;
  fastestSubmitters: Array<{
    user: PopulatedUser;
    avgTime: number;
    fastestSongs: Array<{
      trackInfo: TrackInfo;
      time: number;
      round: PopulatedRound;
    }>;
    submissions: Array<{
      trackInfo: TrackInfo;
      time: number;
      round: PopulatedRound;
    }>;
  }>;
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
    place: number;
    rounds: Array<{
      round: PopulatedRound;
      points: number;
      submission: PopulatedSubmission;
    }>;
  }>;
  conspirators: Array<{
    userId1: string;
    userId2: string;
    user1: PopulatedUser;
    user2: PopulatedUser;
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
  allUserWins: Array<{
    user: PopulatedUser;
    wins: number;
    totalPoints: number;
  }>;
}

export type PopulatedLeague = WithStringId<Omit<League, "users">> & {
  status: "active" | "completed" | "upcoming" | "pending" | "unknown";
  numberOfRounds: number;
  users: PopulatedUser[];
  rounds: {
    current: PopulatedRound | undefined;
    completed: PopulatedRound[];
    upcoming: PopulatedRound[];
    pending: PopulatedRound[];
    bonus: PopulatedRound[];
  };
  playback: LeaguePlaybackStats | null;
};
