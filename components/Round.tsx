import { formatDate } from "@/lib/utils/formatDate";
import { SongSubmission } from "./SongSubmission";
import { SubmittedUsers, UnsubmittedUsers } from "./SubmittedUsers";
import { Fragment, useMemo, useState } from "react";
import VotingRound from "./VotingRound";
import CompletedRound from "./CompletedRound";
import { PopulatedLeague, PopulatedRound, PopulatedUser } from "@/lib/types";
import { MaybeLink } from "./MaybeLink";
import { Avatar } from "./Avatar";
import { MultiLine } from "./MultiLine";
import { Pill } from "./Pill";
import { ToggleButton } from "./ToggleButton";

type FullLeague = Pick<
  PopulatedLeague,
  | "daysForSubmission"
  | "daysForVoting"
  | "users"
  | "votesPerRound"
  | "_id"
  | "rounds"
>;

export function Round({
  currentUser,
  round,
  league,
}: {
  currentUser: PopulatedUser;
  round: PopulatedRound;
  league: FullLeague;
}) {
  const [showVotesView, setShowVotesView] = useState(false);

  const { bodyMarkup, stageTitle } = useMemo(() => {
    switch (round.stage) {
      case "completed": {
        if (showVotesView) {
          return {
            stageTitle: "Completed",
            bodyMarkup: (
              <VotingRound
                key={round.stage}
                round={round}
                league={league}
                currentUser={currentUser}
              />
            ),
          };
        } else {
          return {
            stageTitle: "Completed",
            bodyMarkup: <CompletedRound round={round} users={league.users} />,
          };
        }
      }
      case "submission": {
        if (round.roundIndex !== league.rounds.completed.length) {
          return {
            stageTitle: "Pending",
            bodyMarkup: (
              <div>You cannot submit until the rounds before you do.</div>
            ),
          };
        }

        return {
          stageTitle: "Submission",
          bodyMarkup: (
            <Fragment
              key={round.userSubmission?.trackInfo.trackId ?? "no-submission"}
            >
              <SongSubmission round={round} />
              <SubmittedUsers
                submissions={round.submissions}
                users={league.users}
              />
              <UnsubmittedUsers
                submissions={round.submissions}
                users={league.users}
              />
            </Fragment>
          ),
        };
      }
      case "voting":
      case "currentUserVotingCompleted": {
        return {
          stageTitle: round.stage === "voting" ? "Voting" : "Votes Pending",
          bodyMarkup: (
            <VotingRound
              key={round.stage}
              round={round}
              league={league}
              currentUser={currentUser}
            />
          ),
        };
      }
      case "upcoming": {
        return {
          stageTitle: "Upcoming",
          bodyMarkup: null,
        };
      }
      default: {
        return {
          stageTitle: "Unknown",
          bodyMarkup: (
            <div>
              Invalid round stage &quot;{round.stage}&quot;. If you see this,
              tell Jason.
            </div>
          ),
        };
      }
    }
  }, [currentUser, league, round, showVotesView]);

  const lastVote = useMemo(() => {
    return [...round.votes].sort((a, b) => b.voteDate - a.voteDate)[0];
  }, [round]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MaybeLink
              href={`/leagues/${league._id}/rounds/${round._id}`}
              className="font-semibold text-lg"
            >
              Round {round.roundIndex + 1}: {round.title}
            </MaybeLink>
            <Pill status={round.stage}>{stageTitle}</Pill>
          </div>
          <Avatar
            user={round.creatorObject}
            size={6}
            tooltipText={`Submitted by ${round.creatorObject.firstName}`}
            includeTooltip
          />
        </div>
        <p className="text-gray-600 text-sm">
          <MultiLine>{round.description}</MultiLine>
        </p>
        <div className="flex gap-4 text-xs text-gray-500">
          {round.stage === "completed" ? (
            <div>
              {lastVote && (
                <span>Round ended: {formatDate(lastVote.voteDate)}</span>
              )}
            </div>
          ) : (
            <>
              <span>
                Submissions start: {formatDate(round.submissionStartDate)}
              </span>
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
            </>
          )}
        </div>
      </div>

      {/* Song Submission Section */}
      {round.stage === "completed" && (
        <div className="flex justify-center gap-2">
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
            Your Votes
          </ToggleButton>
        </div>
      )}
      {bodyMarkup}
    </div>
  );
}
