import { PopulatedLeague, PopulatedRound } from "@/lib/types";
import { DateTime } from "./DateTime";
import { Fragment, useState } from "react";
import { twMerge } from "tailwind-merge";
import { MultiLine } from "./MultiLine";
import { Avatar } from "./Avatar";
import { getRoundTitle } from "@/lib/utils/getRoundTitle";
import { MaybeLink } from "./MaybeLink";
import { Pill } from "./Pill";
import { HapticButton } from "./HapticButton";

import spotifyLogo from "../app/images/spotify.svg";
import { useToast } from "@/lib/ToastContext";
import { createSpotifyPlaylist } from "@/lib/utils/createSpotifyPlaylist";
import { unknownToErrorString } from "@/lib/utils/unknownToErrorString";
import { assertNever } from "@/lib/utils/never";

export function RoundInfo({
  round,
  league,
  dateTimeClassName,
}: {
  round: PopulatedRound;
  league: PopulatedLeague;
  dateTimeClassName?: string;
}) {
  const toast = useToast();
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const now = Date.now();
  const stageTitle = (() => {
    switch (round.stage) {
      case "completed": {
        return "Completed";
      }
      case "submission": {
        if (!round._id) {
          return "Pending";
        }
        return "Submission";
      }
      case "voting": {
        return "Voting";
      }
      case "currentUserVotingCompleted": {
        return "Votes Pending";
      }
      case "upcoming": {
        if (round.isPending) {
          return "Pending";
        }
        return "Upcoming";
      }
      case "unknown": {
        return "Unknown";
      }
      default: {
        assertNever(round.stage);
      }
    }
  })();

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
      <HapticButton
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
      </HapticButton>
    );
  })();

  const statusPills = (() => {
    const pills: Array<{ key: string; pill: React.ReactNode }> = [
      {
        key: "normal",
        pill: (
          <Pill status={round.isPending ? "pending" : round.stage}>
            {stageTitle}
          </Pill>
        ),
      },
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
    <div>
      <div className="flex justify-between">
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
        <div className="shrink-0">
          <Avatar
            user={round.creatorObject}
            size={8}
            tooltipText={`Submitted by ${round.creatorObject.userName}`}
            includeTooltip
          />
        </div>
      </div>
      <p className="text-gray-600 text-sm">
        <MultiLine>{round.description}</MultiLine>
      </p>

      <div
        className={twMerge(
          "flex flex-wrap gap-x-2 text-xs text-gray-500",
          dateTimeClassName
        )}
      >
        <DateTime
          prefix={`Submissions ${
            now > round.submissionStartDate ? "started" : "start"
          }:`}
        >
          {round.submissionStartDate}
        </DateTime>
        <span>•</span>
        <DateTime
          prefix={`Submissions ${
            now > round.submissionEndDate ? "ended" : "end"
          }:`}
        >
          {round.submissionEndDate}
        </DateTime>
        <span>•</span>
        <DateTime
          prefix={`Round ${now > round.votingEndDate ? "ended" : "ends"}:`}
        >
          {round.votingEndDate}
        </DateTime>
      </div>
    </div>
  );
}
