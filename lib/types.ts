import type {
  League,
  Round,
  SongSubmission,
  User,
  Vote,
} from "../databaseTypes";
import { SpotifyTrack } from "./spotify";

type SongSubmissionWithTrack = SongSubmission & { trackInfo: SpotifyTrack };
export type PopulatedUser = User;
export type PopulatedSubmission = SongSubmissionWithTrack;

export type PopulatedRoundStage =
  | "upcoming"
  | "completed"
  | "voting"
  | "currentUserVotingCompleted"
  | "submission"
  | "unknown";

export type PopulatedRound = Round & {
  roundIndex: number;
  submissionStartDate: number;
  submissionEndDate: number;
  votingStartDate: number;
  votingEndDate: number;
  stage: PopulatedRoundStage;

  votes: Vote[];
  submissions: PopulatedSubmission[];
  userSubmission: PopulatedSubmission | undefined;
};

export type PopulatedLeague = Omit<League, "users"> & {
  users: PopulatedUser[];
  rounds: {
    current: PopulatedRound | undefined;
    completed: PopulatedRound[];
    upcoming: PopulatedRound[];
  };
};
