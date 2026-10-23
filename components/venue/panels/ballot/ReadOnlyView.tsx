'use client';

import { twMerge } from 'tailwind-merge';
import { UsersList } from '@/components/UsersList';
import { formatDateWithTime } from '@/lib/utils/formatDate';
import type { PopulatedRound, PopulatedUser } from '@/lib/types';
import type { useBallot } from './useBallot';
import { CardExtras, Face, Pile, TrackArt, TrackInfo } from './parts';

type Ballot = ReturnType<typeof useBallot>;

/** Clean read-only view: your picks, guesses, and who has voted. */
export function ReadOnlyView({
  round,
  users,
  currentUser,
  ballot,
  justSubmitted,
}: {
  round: PopulatedRound;
  users: PopulatedUser[];
  currentUser: PopulatedUser;
  ballot: Ballot;
  justSubmitted: boolean;
}) {
  const { votes, usersThatHaveNotVoted } = ballot;
  const isCompleted = round.stage === 'completed';
  const guesses = round.submissions.filter(
    (submission) => votes[submission._id]?.userGuessId,
  );
  const correctGuesses = guesses.filter(
    (submission) => votes[submission._id]?.userGuessId === submission.userId,
  );
  const { title, subtitle } = (() => {
    if (isCompleted) {
      return {
        title: 'Your ballot',
        subtitle:
          guesses.length > 0
            ? `You guessed ${correctGuesses.length} of ${guesses.length} right.`
            : 'You didn’t make any guesses this round.',
      };
    }
    if (justSubmitted) {
      return {
        title: 'Ballot dropped in the box!',
        subtitle: 'You have already submitted your votes.',
      };
    }
    if (usersThatHaveNotVoted.length === 0) {
      return {
        title: 'All votes are in',
        subtitle: `Results will be revealed when the round ends on ${formatDateWithTime(
          round.votingEndDate,
        )}.`,
      };
    }
    return {
      title: 'Waiting on others to vote',
      subtitle: 'You have already submitted your votes.',
    };
  })();

  return (
    <>
      <section className="venue-card ballot-done">
        <div className="ballot-done-icon">{justSubmitted ? '🎉' : '🗳️'}</div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-ink-muted text-sm">{subtitle}</p>
        <p className="text-ink-subtle text-xs mt-1">
          Voting {isCompleted ? 'ended' : 'ends'}{' '}
          {formatDateWithTime(round.votingEndDate)}
        </p>
      </section>

      <div>
        <div className="venue-section-title">Your ballot</div>
        <div className="grid gap-3">
          {round.submissions.map((submission) => {
            const mine = submission.userId === currentUser._id;
            const vote = votes[submission._id];
            const guessUser = users.find((u) => u._id === vote?.userGuessId);
            return (
              <div
                key={submission._id}
                className={twMerge('ballot-card', mine && 'is-mine')}
              >
                <div className="ballot-card-row">
                  <TrackArt submission={submission} round={round} />
                  <div className="ballot-hit">
                    <TrackInfo submission={submission} />
                    {mine && <span className="ballot-mine-tag">Your track</span>}
                    {isCompleted && !mine && submission.userObject && (
                      <span className="ballot-by">
                        by {submission.userObject.userName}
                      </span>
                    )}
                  </div>
                  <div className="ballot-pile-zone">
                    {guessUser && (
                      <span
                        className="ballot-pin is-filled"
                        title={`You guessed ${guessUser.userName}`}
                      >
                        <div>
                          <Face user={guessUser} />
                        </div>
                        {isCompleted && (
                          <span
                            className="ballot-verdict"
                            data-correct={
                              vote?.userGuessId === submission.userId || undefined
                            }
                            aria-label={
                              vote?.userGuessId === submission.userId
                                ? 'Correct guess'
                                : 'Wrong guess'
                            }
                          >
                            {vote?.userGuessId === submission.userId ? '✓' : '✗'}
                          </span>
                        )}
                      </span>
                    )}
                    {(!mine || round.stage === 'currentUserVotingCompleted') && (
                      <Pile count={vote?.points || 0} />
                    )}
                  </div>
                </div>
                <CardExtras submission={submission} note={vote?.note || ''} />
              </div>
            );
          })}
        </div>
      </div>

      <section className="venue-card grid gap-3">
        {ballot.usersThatHaveVoted.length > 0 && (
          <UsersList
            users={ballot.usersThatHaveVoted}
            text={{ noun: 'votes', verb: 'voted' }}
            tooltipText={(user) => {
              const vote = round.votes.find((v) => v.userId === user._id);
              return vote
                ? `${user.userName} voted on ${formatDateWithTime(vote.voteDate)}`
                : user.userName;
            }}
          />
        )}
        {usersThatHaveNotVoted.length > 0 && (
          <UsersList
            users={usersThatHaveNotVoted}
            text={{ noun: 'votes', verb: 'not voted' }}
          />
        )}
      </section>
    </>
  );
}
