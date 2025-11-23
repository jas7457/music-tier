import { SongSubmission } from "./SongSubmission";
import { SubmittedUsers, UnsubmittedUsers } from "./SubmittedUsers";
import { Fragment, useMemo, useState } from "react";
import VotingRound from "./VotingRound";
import CompletedRound from "./CompletedRound";
import { PopulatedLeague, PopulatedRound, PopulatedUser } from "@/lib/types";
import { ToggleButton } from "./ToggleButton";
import { RoundInfo } from "./RoundInfo";

export function Round({
  currentUser,
  round,
  league,
}: {
  currentUser: PopulatedUser;
  round: PopulatedRound;
  league: PopulatedLeague;
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
            />
          );
        } else {
          return <CompletedRound round={round} users={league.users} />;
        }
      }
      case "submission": {
        if (!round._id) {
          return (
            <div>
              {round.creatorObject.userName} still needs to create their round
              before you can submit your song.
            </div>
          );
        }

        return (
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
          />
        );
      }
      case "upcoming": {
        return null;
      }
      default: {
        return (
          <div>
            Invalid round stage &quot;{round.stage}&quot;. If you see this, tell
            Jason.
          </div>
        );
      }
    }
  }, [currentUser, league, round, showVotesView]);

  return (
    <div className="flex flex-col gap-4">
      <RoundInfo league={league} round={round} />

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
