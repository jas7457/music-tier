import { SongSubmission } from "./SongSubmission";
import { SubmittedUsers, UnsubmittedUsers } from "./SubmittedUsers";
import { Fragment, useEffect, useMemo, useState } from "react";
import VotingRound from "./VotingRound";
import CompletedRound from "./CompletedRound";
import { PopulatedLeague, PopulatedRound, PopulatedUser } from "@/lib/types";
import { ToggleButton } from "./ToggleButton";
import { RoundInfo } from "./RoundInfo";
import { HapticButton } from "./HapticButton";
import { useToast } from "@/lib/ToastContext";
import { getOnDeckInfo, OnDeckSubmissionsList } from "./OnDeckSubmissions";
import { TrackInfo } from "@/databaseTypes";
import Link from "next/link";

export function Round({
  currentUser,
  round,
  league,
  isRoundPage,
}: {
  currentUser: PopulatedUser;
  round: PopulatedRound;
  league: PopulatedLeague;
  isRoundPage: boolean;
}) {
  const [showVotesView, setShowVotesView] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [roundTitle, setRoundTitle] = useState(round.title);
  const [roundDescription, setRoundDescription] = useState(round.description);
  const [onDeckSubmissions, setOnDeckSubmissions] = useState<
    Array<{
      trackInfo: TrackInfo;
      isAddedToSidePlaylist: boolean;
    }>
  >(round.onDeckSubmissions);

  useEffect(() => {
    setOnDeckSubmissions(round.onDeckSubmissions);
  }, [round.onDeckSubmissions]);

  const toast = useToast();

  const canEdit = (() => {
    if (!isRoundPage) {
      return false;
    }
    if (currentUser._id !== round.creatorId) {
      return false;
    }
    if (round.stage !== "upcoming") {
      return false;
    }
    if (!round._id) {
      return false;
    }
    return true;
  })();

  const canShowOnDeck = getOnDeckInfo({
    round,
    isRoundPage,
    isGeneralRoundSlot: true,
  }).isVisible;

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
            <SongSubmission round={round} isRoundPage={isRoundPage} />
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
  }, [currentUser, isRoundPage, league, round, showVotesView]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-1">
        {isRoundPage && (round.previousRound || round.nextRound) && (
          <div className="grid grid-cols-[1fr_1fr] gap-1 text-sm">
            <div className="truncate">
              {round.previousRound && (
                <Link
                  href={`/leagues/${league._id}/rounds/${round.previousRound._id}`}
                  className="text-primary-dark hover:underline"
                >
                  ← Round {round.previousRound.roundIndex + 1}
                </Link>
              )}
            </div>
            <div className="truncate text-right">
              {round.nextRound && (
                <Link
                  href={`/leagues/${league._id}/rounds/${round.nextRound._id}`}
                  className="text-primary-dark hover:underline"
                >
                  Round {round.nextRound.roundIndex + 1} →
                </Link>
              )}
            </div>
          </div>
        )}
        <RoundInfo
          league={league}
          round={{ ...round, title: roundTitle, description: roundDescription }}
          {...(canEdit
            ? {
                onTitleUpdate: setRoundTitle,
                onDescriptionUpdate: setRoundDescription,
              }
            : {})}
        />
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

      {canShowOnDeck && (
        <OnDeckSubmissionsList
          round={round}
          isRoundPage={isRoundPage}
          onDeckSubmissions={onDeckSubmissions}
          onUpdate={setOnDeckSubmissions}
        />
      )}

      {canEdit && (
        <div>
          <HapticButton
            disabled={isUpdating}
            className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={async () => {
              try {
                setIsUpdating(true);
                const response = await fetch(
                  `/api/leagues/${league._id}/rounds`,
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      roundId: round._id,
                      title: roundTitle,
                      description: roundDescription,
                      isBonusRound: round.isBonusRound,
                      isKickoffRound: round.isKickoffRound,
                    }),
                  }
                );

                if (response.ok) {
                  toast.show({
                    variant: "success",
                    message: "Round updated successfully",
                  });
                  return;
                }

                try {
                  const data = await response.json();
                  toast.show({
                    variant: "error",
                    message: data.error || "Error updating round",
                  });
                } catch {
                  toast.show({
                    variant: "error",
                    message: "Error updating round",
                  });
                }
              } catch {
              } finally {
                setIsUpdating(false);
              }
            }}
          >
            Update
          </HapticButton>
        </div>
      )}
    </div>
  );
}
