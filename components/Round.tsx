import { formatDate } from "@/lib/utils/formatDate";
import { SongSubmission } from "./SongSubmission";
import { SubmittedUsers, UnsubmittedUsers } from "./SubmittedUsers";
import { useMemo, useState } from "react";
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
  const [showVotesView, setShowVotesView] = useState(false);

  const bodyMarkup = useMemo(() => {
    switch (round.stage) {
      case "completed": {
        if (showVotesView) {
          return (
            <VotingRound
              key={round.stage}
              round={round}
              league={league}
              currentUser={currentUser}
              onDataSaved={onDataSaved}
            />
          );
        } else {
          return <CompletedRound round={round} users={league.users} />;
        }
      }
      case "submission": {
        return (
          <div className="flex flex-col gap-4">
            <SongSubmission
              userSubmission={round.userSubmission}
              onDataSaved={onDataSaved}
              round={round}
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
          </div>
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
          />
        );
      }
      default: {
        return null;
      }
    }
  }, [currentUser, league, onDataSaved, round, showVotesView]);

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
        <span>Submissions start: {formatDate(round.submissionStartDate)}</span>
        <span>•</span>
        <span>
          Submissions end:{" "}
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
      <div>
        {round.stage === "completed" && (
          <div className="flex justify-center gap-2 my-4">
            <ToggleButton
              onClick={() => setShowVotesView(false)}
              selected={!showVotesView}
            >
              Results
            </ToggleButton>
            <ToggleButton
              onClick={() => setShowVotesView(true)}
              selected={showVotesView}
            >
              Votes & Guesses
            </ToggleButton>
          </div>
        )}
        {bodyMarkup}
      </div>
    </div>
  );
}

function ToggleButton({
  children,
  onClick,
  selected,
}: {
  onClick: () => void;
  children: React.ReactNode;
  selected: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        selected
          ? "bg-blue-600 text-white"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      {children}
    </button>
  );
}
