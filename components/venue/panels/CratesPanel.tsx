'use client';

import { Round } from '@/components/Round';
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

  if (selected) {
    return (
      <div className="venue-panel">
        <Round
          key={`${selected._id}-${selected.stage}`}
          currentUser={user}
          round={selected}
          league={league}
          isRoundPage
        />
      </div>
    );
  }

  const groups: Array<{ title: string; rounds: PopulatedRound[] }> = [
    { title: 'Kickoff', rounds: league.rounds.kickoff },
    {
      title: 'This season',
      rounds: sortRounds([
        ...league.rounds.completed,
        ...(league.rounds.current ? [league.rounds.current] : []),
        ...league.rounds.upcoming,
      ]).filter((r) => !r.isBonusRound && !r.isKickoffRound),
    },
    { title: 'Bonus', rounds: league.rounds.bonus },
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
          // eslint-disable-next-line @next/next/no-img-element
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
