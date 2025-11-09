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
  round: TRound,
  league: Pick<
    GetUserLeagueReturnType[number],
    "daysForSubmission" | "daysForVoting" | "users"
  >
) {
  const now = Date.now();
  const submissionEndDate =
    round.submissionStartDate + league.daysForSubmission * ONE_DAY_MS;
  const votingEndDate = submissionEndDate + league.daysForVoting * ONE_DAY_MS;

  const isSubmissionOpen =
    now >= round.submissionStartDate && now < submissionEndDate;
  const isVotingOpen = now >= submissionEndDate && now < votingEndDate;

  const stage = (() => {
    if (now >= votingEndDate) {
      return "completed" as const;
    }
    if (now < round.submissionStartDate) {
      return "upcoming" as const;
    }
    if (isVotingOpen) {
      if (round.votes.length >= league.users.length) {
        return "completed" as const;
      }
      return "voting" as const;
    }
    if (isSubmissionOpen) {
      if (round.submissions.length >= league.users.length) {
        return "voting" as const;
      }
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
