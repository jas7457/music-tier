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
import spotifyLogo from "../app/images/spotify.svg";
import { useToast } from "@/lib/ToastContext";
import { createSpotifyPlaylist } from "@/lib/utils/createSpotifyPlaylist";
import { getRoundTitle } from "@/lib/utils/getRoundTitle";
import { unknownToErrorString } from "@/lib/utils/unknownToErrorString";

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
  const toast = useToast();
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

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
        if (!round._id) {
          return {
            stageTitle: "Pending",
            bodyMarkup: (
              <div>
                {round.creatorObject.userName} still needs to create their round
                before you can submit your song.
              </div>
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
            const message = unknownToErrorString(
              err,
              "Error creating playlist"
            );
            toast.show({
              title: "Error creating playlist",
              variant: "error",
              message,
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
          title={
            round.spotifyPlaylistId
              ? "Listen on Spotify"
              : "Create Spotify Playlist"
          }
        />
      </button>
    );
  })();

  const now = Date.now();

  const statusPills = (() => {
    const pills: Array<{ key: string; pill: React.ReactNode }> = [
      { key: "normal", pill: <Pill status={round.stage}>{stageTitle}</Pill> },
    ];

    if (
      now > round.submissionEndDate &&
      round.submissions.length < league.users.length
    ) {
      pills.push({
        key: "submissions",
        pill: <Pill status="error">Not all users submitted</Pill>,
      });
    }

    if (now > round.votingEndDate && round.votes.length < league.users.length) {
      pills.push({
        key: "votes",
        pill: <Pill status="error">Not all users voted</Pill>,
      });
    }

    return pills.map(({ key, pill }) => <Fragment key={key}>{pill}</Fragment>);
  })();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap items-center gap-2">
            <MaybeLink
              href={`/leagues/${league._id}/rounds/${round._id}`}
              className="font-semibold text-lg"
              forceNormalText={!round._id}
            >
              {getRoundTitle(round)}
            </MaybeLink>

            {spotifyMarkup}

            {statusPills}
          </div>
          <Avatar
            user={round.creatorObject}
            size={6}
            tooltipText={`Submitted by ${round.creatorObject.userName}`}
            includeTooltip
          />
        </div>
        <p className="text-gray-600 text-sm">
          <MultiLine>{round.description}</MultiLine>
        </p>
        <div className="flex flex-wrap gap-2 md:gap-4 text-xs text-gray-500">
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
