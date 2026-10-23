'use client';

import type { PopulatedRound, PopulatedUser } from '@/lib/types';
import { UsersList } from '@/components/UsersList';
import { formatDateWithTime } from '@/lib/utils/formatDate';
import { useBallot } from './useBallot';
import { VoteStep } from './VoteStep';
import { GuessStep } from './GuessStep';
import { SubmitBox } from './SubmitBox';
import { ReadOnlyView } from './ReadOnlyView';
import './ballot.css';

type League = {
  _id: string;
  votesPerRound: number;
  users: Array<PopulatedUser>;
};

/** Spend chips → guess who → drop it in the box. */
export function BallotBox({
  round,
  league,
  currentUser,
}: {
  round: PopulatedRound;
  league: League;
  currentUser: PopulatedUser;
}) {
  const ballot = useBallot(round, league, currentUser);

  return (
    <div className="ballot">
      {ballot.step === 'voting' && (
        <VoteStep
          round={round}
          votesPerRound={league.votesPerRound}
          currentUser={currentUser}
          ballot={ballot}
        />
      )}
      {ballot.step === 'guessing' && (
        <>
          <GuessStep
            round={round}
            users={league.users}
            currentUser={currentUser}
            ballot={ballot}
          />
          <SubmitBox ballot={ballot} />
        </>
      )}
      {ballot.step === 'submitted' && (
        <ReadOnlyView
          round={round}
          users={league.users}
          currentUser={currentUser}
          ballot={ballot}
          justSubmitted={round.stage === 'voting'}
        />
      )}
      {ballot.step !== 'submitted' && (
        <section className="venue-card grid gap-3">
          <p className="text-ink-subtle text-xs">
            Voting ends {formatDateWithTime(round.votingEndDate)}
          </p>
          {ballot.usersThatHaveVoted.length > 0 && (
            <UsersList
              users={ballot.usersThatHaveVoted}
              text={{ noun: 'votes', verb: 'voted' }}
            />
          )}
          {ballot.usersThatHaveNotVoted.length > 0 && (
            <UsersList
              users={ballot.usersThatHaveNotVoted}
              text={{ noun: 'votes', verb: 'not voted' }}
            />
          )}
        </section>
      )}
    </div>
  );
}
