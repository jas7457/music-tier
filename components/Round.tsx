import { formatDate } from "@/lib/utils/formatDate";
import { SongSubmission } from "./SongSubmission";
import { SubmittedUsers, UnsubmittedUsers } from "./SubmittedUsers";
import { useMemo } from "react";
import VotingRound from "./VotingRound";
import CompletedRound from "./CompletedRound";
import { PopulatedLeague, PopulatedRound, PopulatedUser } from "@/lib/types";
import { MaybeLink } from "./MaybeLink";
import { Avatar } from "./Avatar";

type FullLeague = Pick<
  PopulatedLeague,
  "daysForSubmission" | "daysForVoting" | "users" | "votesPerRound" | "_id"
>;

export function Round({
  currentUser,
  round,
  league,
  onDataSaved,
}: {
  currentUser: PopulatedUser;
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
  }, [currentUser, league, onDataSaved, round]);

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <MaybeLink
            href={`/leagues/${league._id}/rounds/${round._id}`}
            className="font-semibold text-lg mb-1"
          >
            Round {round.roundIndex + 1}: {round.title}
          </MaybeLink>
          <p className="text-gray-600 text-sm mb-2">{round.description}</p>
        </div>
        <Avatar user={round.creatorObject} size={10} includeTooltip />
      </div>
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
    </div>
  );
}
