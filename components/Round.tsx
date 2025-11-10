import { SpotifyTrack } from "@/lib/spotify";
import type {
  League,
  Round as RoundType,
  SongSubmission as SongSubmissionType,
  User,
  Vote,
} from "../databaseTypes";
import { formatDate } from "@/lib/utils/formatDate";
import { SongSubmission } from "./SongSubmission";
import { SubmittedUsers } from "./SubmittedUsers";
import { GetUserLeagueReturnType } from "@/lib/data";
import { decorateRound } from "@/lib/utils/decorateRound";
import { useMemo } from "react";
import VotingRound from "./VotingRound";

type FullRound = RoundType & {
  submissions: (SongSubmissionType & { trackInfo: SpotifyTrack })[];
  votes: Vote[];
  userSubmission?: SongSubmissionType & { trackInfo: SpotifyTrack };
};

type FullLeague = Pick<
  GetUserLeagueReturnType[number],
  "daysForSubmission" | "daysForVoting" | "users" | "votesPerRound"
>;

export function Round({
  currentUser,
  round: _round,
  league,
  onSongSubmissionSubmit,
}: {
  currentUser: User;
  round: FullRound;
  league: FullLeague;
  onSongSubmissionSubmit: () => void;
}) {
  const round = decorateRound(_round, league);

  const bodyMarkup = useMemo(() => {
    switch (round.stage) {
      case "completed": {
        return <div>It is completed</div>;
      }
      case "submission": {
        return (
          <>
            <SongSubmission
              userSubmission={round.userSubmission}
              onSubmit={onSongSubmissionSubmit}
              // ref={(ref) => {
              //   if (ref) {
              //     submissionRefs.current.set(league.rounds!.current!._id, ref);
              //   }
              // }}
              roundId={round._id}
              roundEndDate={
                round.voteStartDate
                  ? round.voteStartDate +
                    league.daysForVoting * 24 * 60 * 60 * 1000
                  : null
              }
            />
            <SubmittedUsers
              submissions={round.submissions}
              users={league.users}
            />
          </>
        );
      }
      case "voting": {
        return (
          <VotingRound
            round={_round}
            league={league}
            currentUser={currentUser}
          />
        );
      }
      default: {
        return null;
      }
    }

    return null;
  }, []);

  return (
    <>
      <h4 className="font-semibold text-lg mb-1">{round.title}</h4>
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
