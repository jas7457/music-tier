import { formatDate } from "@/lib/utils/formatDate";
import { SongSubmission } from "./SongSubmission";
import { SubmittedUsers, UnsubmittedUsers } from "./SubmittedUsers";
import { Fragment, useMemo, useState, ViewTransition } from "react";
import VotingRound from "./VotingRound";
import CompletedRound from "./CompletedRound";
import { PopulatedLeague, PopulatedRound, PopulatedUser } from "@/lib/types";
import { MaybeLink } from "./MaybeLink";
import { Avatar } from "./Avatar";
import { MultiLine } from "./MultiLine";
import { Pill } from "./Pill";
import { ToggleButton } from "./ToggleButton";
import spotifyLogo from "../app/images/spotify.svg";
import { useToast } from "@/lib/ToastContext";
import { createSpotifyPlaylist } from "@/lib/utils/createSpotifyPlaylist";

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
  const toast = useToast();
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const { bodyMarkup, stageTitle } = useMemo(() => {
    switch (round.stage) {
      case "completed": {
        if (showVotesView) {
          return {
            stageTitle: "Completed",
            bodyMarkup: (
              <ViewTransition name={`round-${round._id}.votingRoundView`}>
                <VotingRound
                  key={round.stage}
                  round={round}
                  league={league}
                  currentUser={currentUser}
                />
              </ViewTransition>
            ),
          };
        } else {
          return {
            stageTitle: "Completed",
            bodyMarkup: (
              <ViewTransition name={`round-${round._id}.completedRoundView`}>
                <CompletedRound round={round} users={league.users} />
              </ViewTransition>
            ),
          };
        }
      }
      case "submission": {
        /*
        if (round.roundIndex !== league.rounds.completed.length) {
          return {
            stageTitle: "Pending",
            bodyMarkup: (
              <div>You cannot submit until the rounds before you do.</div>
            ),
          };
        }
          */

        return {
          stageTitle: "Submission",
          bodyMarkup: (
            <ViewTransition
              name={`round-${round._id}.submissionView`}
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
            </ViewTransition>
          ),
        };
      }
      case "voting":
      case "currentUserVotingCompleted": {
        return {
          stageTitle: round.stage === "voting" ? "Voting" : "Votes Pending",
          bodyMarkup: (
            <ViewTransition name={`round-${round._id}.votingRoundView`}>
              <VotingRound
                key={round.stage}
                round={round}
                league={league}
                currentUser={currentUser}
              />
            </ViewTransition>
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

  const spotifyMarkup = (() => {
    if (round.submissions.length < league.users.length) {
      return null;
    }

    if (round.spotifyPlaylistId) {
      return (
        <a
          href={`https://open.spotify.com/playlist/${round.spotifyPlaylistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex gap-1 items-center hover:underline"
        >
          <img
            alt=""
            src={spotifyLogo.src}
            width={20}
            title="Listen on Spotify"
          />
        </a>
      );
    }

    return (
      <button
        disabled={creatingPlaylist}
        className="disabled:opacity-30"
        title="Create playlist"
        onClick={async () => {
          try {
            setCreatingPlaylist(true);
            await createSpotifyPlaylist({ round });
          } catch (err) {
            const errorMessage = (() => {
              if (typeof err === "string") {
                return err;
              }
              if (err instanceof Error) {
                return err.message;
              }
              return "An unknown error occurred";
            })();
            toast.show({
              title: "Error creating playlist",
              variant: "error",
              message: errorMessage,
            });
          } finally {
            setCreatingPlaylist(false);
          }
        }}
      >
        <img
          alt=""
          src={spotifyLogo.src}
          width={20}
          title="Listen on Spotify"
        />
      </button>
    );
  })();

  const now = Date.now();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ViewTransition name={`round-${round._id}.title`}>
              <MaybeLink
                href={`/leagues/${league._id}/rounds/${round._id}`}
                className="font-semibold text-lg"
              >
                Round {round.roundIndex + 1}: {round.title}
              </MaybeLink>
            </ViewTransition>

            {spotifyMarkup}

            <ViewTransition name={`round-${round._id}.status`}>
              <Pill status={round.stage}>{stageTitle}</Pill>
            </ViewTransition>
          </div>

          <ViewTransition name={`round-${round._id}.creator`}>
            <Avatar
              user={round.creatorObject}
              size={6}
              tooltipText={`Submitted by ${round.creatorObject.firstName}`}
              includeTooltip
            />
          </ViewTransition>
        </div>

        <ViewTransition name={`round-${round._id}.description`}>
          <p className="text-gray-600 text-sm">
            <MultiLine>{round.description}</MultiLine>
          </p>
        </ViewTransition>

        <ViewTransition name={`round-${round._id}.details`}>
          <div className="flex gap-4 text-xs text-gray-500">
            {round.stage === "completed" ? (
              <div className="flex flex-col gap-1">
                {lastVote && (
                  <span>Round ended: {formatDate(lastVote.voteDate)}</span>
                )}
              </div>
            ) : (
              <>
                <span>
                  Submissions{" "}
                  {now > round.submissionStartDate ? "started" : "start"}:{" "}
                  {formatDate(round.submissionStartDate)}
                </span>
                <span>•</span>
                <span>
                  Submissions {now > round.submissionEndDate ? "ended" : "end"}:{" "}
                  {formatDate(round.submissionEndDate)}
                </span>
                <span>•</span>
                <span>
                  Round {now > round.votingEndDate ? "ended" : "ends"}:{" "}
                  {formatDate(round.votingEndDate)}
                </span>
              </>
            )}
          </div>
        </ViewTransition>
      </div>

      {/* Song Submission Section */}
      {round.stage === "completed" && (
        <ViewTransition name={`round-${round._id}.toggleVotes`}>
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
        </ViewTransition>
      )}
      {bodyMarkup}
    </div>
  );
}
