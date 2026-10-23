'use client';

import { Round } from '@/components/Round';
import { RoundResults } from './results/RoundResults';
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

  // Kickoff/bonus rounds can sit in any of the league's round lists, so group
  // from all of them.
  const seen = new Set<string>();
  const everyRound = sortRounds(model.allRounds).filter((round) => {
    const key = round._id || `pending-${round.roundIndex}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  const groups: Array<{ title: string; rounds: PopulatedRound[] }> = [
    { title: 'Kickoff', rounds: everyRound.filter((r) => r.isKickoffRound) },
    {
      title: 'This season',
      rounds: everyRound.filter((r) => !r.isKickoffRound && !r.isBonusRound),
    },
    { title: 'Bonus', rounds: everyRound.filter((r) => r.isBonusRound) },
  ].filter((group) => group.rounds.length > 0);

  return (
    <div className="venue-panel">
      {groups.map((group) => (
        <section key={group.title}>
          <h3 className="venue-section-title">{group.title}</h3>
          <div className="venue-sleeves">
            {group.rounds.map((round) => (
              <Sleeve
                key={round._id || `pending-${round.roundIndex}`}
                round={round}
                onOpen={() => round._id && openRound(round._id)}
              />
            ))}
          </div>
        </section>
      ))}
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
        R{round.roundIndex + 1} · {status}
      </div>
    </button>
  );
}
