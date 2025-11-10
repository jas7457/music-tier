import type {
  Round as RoundType,
  SongSubmission as SongSubmissionType,
  Vote,
} from "../../databaseTypes";
import { GetUserLeagueReturnType } from "@/lib/data";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type RoundWithSubmissions = RoundType & {
  submissions: SongSubmissionType[];
  votes: Vote[];
};

export function decorateRound<TRound extends RoundWithSubmissions>(
  currentUserId: string,
  round: TRound,
  league: Pick<
    GetUserLeagueReturnType[number],
    "daysForSubmission" | "daysForVoting" | "users" | "votesPerRound"
  >
) {
  const now = Date.now();
  const submissionEndDate =
    round.submissionStartDate + league.daysForSubmission * ONE_DAY_MS;
  const votingEndDate = submissionEndDate + league.daysForVoting * ONE_DAY_MS;

  const allUsersSubmitted = round.submissions.length >= league.users.length;
  const allUsersVoted =
    round.votes.length >= league.users.length * league.votesPerRound;

  const isVotingOpen = (() => {
    if (now >= votingEndDate) {
      return false;
    }
    if (allUsersVoted) {
      return false;
    }
    if (allUsersSubmitted) {
      return true;
    }
    return false;
  })();
  const isSubmissionOpen =
    !isVotingOpen &&
    now >= round.submissionStartDate &&
    now < submissionEndDate;

  const stage = (() => {
    if (now >= votingEndDate) {
      return "completed" as const;
    }
    if (now < round.submissionStartDate) {
      return "upcoming" as const;
    }
    if (isVotingOpen) {
      const yourVotedPoints = round.votes
        .filter((v) => v.userId === currentUserId)
        .reduce((sum, v) => sum + v.points, 0);
      if (yourVotedPoints >= league.votesPerRound) {
        return "votingCompleted" as const;
      }
      return "voting" as const;
    }
    if (isSubmissionOpen) {
      return "submission" as const;
    }
    return "unknown" as const;
  })();

  return {
    ...round,
    submissionEndDate,
    votingEndDate,
    stage,
  };
}
