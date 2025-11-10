import type {
  SongSubmission as SongSubmissionType,
  User,
} from "../databaseTypes";
import { formatDate } from "@/lib/utils/formatDate";
import { SongSubmission } from "./SongSubmission";
import { SubmittedUsers, UnsubmittedUsers } from "./SubmittedUsers";
import { useMemo } from "react";
import VotingRound from "./VotingRound";
import CompletedRound from "./CompletedRound";
import { PopulatedLeague, PopulatedRound } from "@/lib/types";

type FullLeague = Pick<
  PopulatedLeague,
  "daysForSubmission" | "daysForVoting" | "users" | "votesPerRound"
>;

export function Round({
  currentUser,
  round,
  league,
  onDataSaved,
}: {
  currentUser: User;
  round: PopulatedRound;
  league: FullLeague;
  onDataSaved: () => void;
}) {
  const bodyMarkup = useMemo(() => {
    switch (round.stage) {
      case "completed": {
        return <CompletedRound round={round} users={league.users} />;
      }
      case "submission": {
        return (
          <>
            <SongSubmission
              userSubmission={round.userSubmission}
              onDataSaved={onDataSaved}
              // ref={(ref) => {
              //   if (ref) {
              //     submissionRefs.current.set(league.rounds!.current!._id, ref);
              //   }
              // }}
              roundId={round._id}
              roundEndDate={round.votingEndDate}
            />
            <SubmittedUsers
              submissions={round.submissions}
              users={league.users}
            />
            <UnsubmittedUsers
              submissions={round.submissions}
              users={league.users}
            />
          </>
        );
      }
      case "voting":
      case "currentUserVotingCompleted": {
        return (
          <VotingRound
            key={round.stage}
            round={round}
            league={league}
            currentUser={currentUser}
            onDataSaved={onDataSaved}
            isVotingEnabled={round.stage === "voting"}
          />
        );
      }
      default: {
        return null;
      }
    }
  }, [round]);

  return (
    <>
      <h4 className="font-semibold text-lg mb-1">
        Round {round.roundIndex + 1}: {round.title}
      </h4>
      <p className="text-gray-600 text-sm mb-2">{round.description}</p>
      <div className="flex gap-4 text-xs text-gray-500">
        <span>
          Submissions start date: {formatDate(round.submissionStartDate)}
        </span>
        <span>•</span>
        <span>
          Submission end date:{" "}
          {formatDate(
            round.submissionStartDate! +
              league.daysForSubmission * 24 * 60 * 60 * 1000
          )}
        </span>
        <span>•</span>
        <span>
          Round ends:{" "}
          {formatDate(
            round.submissionStartDate! +
              (league.daysForSubmission + league.daysForVoting) *
                24 *
                60 *
                60 *
                1000
          )}
        </span>
      </div>

      {/* Song Submission Section */}
      <div id={`submission-${round._id}`}>{bodyMarkup}</div>
    </>
  );
}
