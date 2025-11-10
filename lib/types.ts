import type {
  League,
  Round,
  SongSubmission,
  User,
  Vote,
} from "../databaseTypes";

type WithStringId<T> = Omit<T, "_id"> & { _id: string };

export type PopulatedUser = WithStringId<User> & { index: number };
export type PopulatedSubmission = WithStringId<SongSubmission>;
export type PopulatedVote = WithStringId<Vote>;
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
  userSubmission: PopulatedSubmission | undefined;
};

export type PopulatedLeague = WithStringId<Omit<League, "users">> & {
  users: PopulatedUser[];
  rounds: {
    current: PopulatedRound | undefined;
    completed: PopulatedRound[];
    upcoming: PopulatedRound[];
  };
};
