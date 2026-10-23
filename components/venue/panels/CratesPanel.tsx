'use client';

import { Round } from '@/components/Round';
import { RoundResults } from './results/RoundResults';
import { RoundInfo } from '@/components/RoundInfo';
import { BallotBox } from './ballot/BallotBox';
import { BoothSubmission } from './BoothPanel';
import { getRoundTitle } from '@/lib/utils/getRoundTitle';
import type { PopulatedRound } from '@/lib/types';
import { getRoundResults } from '../venueModel';
import type { PanelProps } from './types';

function sortRounds(rounds: PopulatedRound[]) {
  return [...rounds].sort((a, b) => a.submissionStartDate - b.submissionStartDate);
}

/** Every round as a record sleeve; tap one to pull it out. */
export function CratesPanel({
  league,
  user,
  model,
  openRound,
  roundId,
}: PanelProps & { roundId: string | null }) {
  const selected = roundId
    ? model.allRounds.find((round) => round._id === roundId)
    : undefined;

  if (selected?.stage === 'completed' && selected._id) {
    return (
      <div className="venue-panel">
        <RoundResults
          key={selected._id}
          round={selected}
          league={league}
          user={user}
          openRound={openRound}
        />
      </div>
    );
  }

  // A round that's open for voting or submissions uses the same ballot box /
  // DJ booth as those stations, so there's only one way to do each.
  const isVoting =
    selected?.stage === 'voting' ||
    selected?.stage === 'currentUserVotingCompleted';
  const isSubmitting = selected?.stage === 'submission' && Boolean(selected._id);
  if (selected && (isVoting || isSubmitting)) {
    return (
      <div className="venue-panel">
        <div className="grid gap-1">
          <RoundNav round={selected} openRound={openRound} />
          <RoundInfo league={league} round={selected} />
        </div>
        {isVoting ? (
          <BallotBox
            key={`${selected._id}-${selected.stage}`}
            round={selected}
            league={league}
            currentUser={user}
          />
        ) : (
          <BoothSubmission round={selected} league={league} />
        )}
      </div>
    );
  }

  if (selected) {
    return (
      <div className="venue-panel">
        <Round
          key={`${selected._id}-${selected.stage}`}
          currentUser={user}
          round={selected}
          league={league}
          isRoundPage
          onNavigateRound={openRound}
        />
      </div>
    );
  }

  // One list of every round in play order (kickoff and bonus rounds included,
  // tagged on their sleeve). They can sit in any of the league's round lists.
  const seen = new Set<string>();
  const everyRound = sortRounds(model.allRounds).filter((round) => {
    const key = round._id || `pending-${round.roundIndex}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return (
    <div className="venue-panel">
      <div className="venue-sleeves">
        {everyRound.map((round) => (
          <Sleeve
            key={round._id || `pending-${round.roundIndex}`}
            round={round}
            onOpen={() => round._id && openRound(round._id)}
          />
        ))}
      </div>
    </div>
  );
}

function Sleeve({
  round,
  onOpen,
}: {
  round: PopulatedRound;
  onOpen: () => void;
}) {
  const winner =
    round.stage === 'completed' ? getRoundResults(round)[0] : undefined;
  const art = winner?.submission.trackInfo.albumImageUrl;
  const status = (() => {
    switch (round.stage) {
      case 'completed':
        return winner ? `🏆 ${winner.user.userName}` : 'Done';
      case 'submission':
        return 'Submissions open';
      case 'voting':
      case 'currentUserVotingCompleted':
        return 'Voting';
      default:
        return round.isPending ? 'Not written' : 'Upcoming';
    }
  })();
  return (
    <button
      type="button"
      className="venue-sleeve"
      onClick={onOpen}
      disabled={!round._id}
      data-stage={round.stage}
    >
      <div className="venue-sleeve-art">
        {art ? (
           
          <img src={art} alt="" loading="lazy" />
        ) : (
          <span>{round.roundIndex + 1}</span>
        )}
        <div className="venue-sleeve-vinyl" aria-hidden />
      </div>
      <div className="venue-sleeve-title">{getRoundTitle(round, false)}</div>
      <div className="venue-sleeve-meta">
        R{round.roundIndex + 1}
        {round.isKickoffRound ? ' · Kickoff' : round.isBonusRound ? ' · Bonus' : ''} ·{' '}
        {status}
      </div>
    </button>
  );
}

/** Previous / next round, staying inside the crates. */
function RoundNav({
  round,
  openRound,
}: {
  round: PopulatedRound;
  openRound: (roundId: string) => void;
}) {
  const previousId = round.previousRound?._id;
  const nextId = round.nextRound?._id;
  if (!previousId && !nextId) {
    return null;
  }
  return (
    <div className="grid grid-cols-2 gap-1 text-sm">
      <div className="truncate">
        {round.previousRound && previousId && (
          <button
            type="button"
            className="font-medium text-primary-dark hover:underline"
            onClick={() => openRound(previousId)}
          >
            ← Round {round.previousRound.roundIndex + 1}
          </button>
        )}
      </div>
      <div className="truncate text-right">
        {round.nextRound && nextId && (
          <button
            type="button"
            className="font-medium text-primary-dark hover:underline"
            onClick={() => openRound(nextId)}
          >
            Round {round.nextRound.roundIndex + 1} →
          </button>
        )}
      </div>
    </div>
  );
}
