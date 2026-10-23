'use client';

import { RoundInfo } from '@/components/RoundInfo';
import { CreateRound } from '@/components/CreateRound';
import { Avatar } from '@/components/Avatar';
import { MultiLine } from '@/components/MultiLine';
import { GracePeriodNotice } from '@/components/GracePeriodNotice';
import { DateTime } from '@/components/DateTime';
import { STATIONS } from '../stations';
import type { PanelProps } from './types';
import { Countdown } from '../hud/Countdown';

/** The main stage: what this round is about and what you should do next. */
export function StagePanel({ league, model, goTo, openRound }: PanelProps) {
  const round = model.currentRound;
  const upcoming = league.rounds.upcoming.filter((r) => !r.isHidden).slice(0, 3);

  return (
    <div className="venue-panel">
      {round ? (
        <section className="venue-card">
          <div className="venue-eyebrow" style={{ color: model.theme.color }}>
            Now playing · {model.theme.label}
          </div>
          <RoundInfo league={league} round={round} />
          {round.gracePeriod && <GracePeriodNotice round={round} />}
          <StageDeadline round={round} />
          <div className="mt-3 grid gap-2">
            {round.stage === 'submission' && round._id && (
              <button
                type="button"
                className="venue-cta"
                style={{ '--cta': STATIONS.booth.color } as React.CSSProperties}
                onClick={() => goTo('booth')}
              >
                💿 {round.userSubmission ? 'Change your song' : 'Head to the DJ booth to submit'}
              </button>
            )}
            {(round.stage === 'voting' ||
              round.stage === 'currentUserVotingCompleted') && (
              <button
                type="button"
                className="venue-cta"
                style={{ '--cta': STATIONS.ballot.color } as React.CSSProperties}
                onClick={() => goTo('ballot')}
              >
                🗳️ {round.stage === 'voting' ? 'Go cast your votes' : 'See how voting is going'}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="venue-card text-center">
          <div className="text-4xl mb-2">🎙️</div>
          <h3 className="font-bold text-lg">The stage is dark</h3>
          <p className="text-ink-muted text-sm">
            {league.status === 'completed'
              ? 'This league has wrapped. Check the jukebox for the recap.'
              : 'No round is running right now.'}
          </p>
        </section>
      )}

      {/* Your round theme(s) */}
      {model.canCreateKickoff && (
        <CreateRound leagueId={league._id} isBonusRound={false} isKickoffRound />
      )}
      {!model.userHasCreatedRound && league.status !== 'completed' && (
        <CreateRound
          leagueId={league._id}
          isBonusRound={false}
          isKickoffRound={false}
        />
      )}
      {model.canCreateBonus && (
        <CreateRound leagueId={league._id} isBonusRound isKickoffRound={false} />
      )}

      {upcoming.length > 0 && (
        <section>
          <h3 className="venue-section-title">Coming up</h3>
          <div className="grid gap-2">
            {upcoming.map((r) => (
              <button
                key={r._id || r.roundIndex}
                type="button"
                className="venue-row"
                disabled={!r._id}
                onClick={() => r._id && openRound(r._id)}
              >
                <Avatar user={r.creatorObject} size={8} includeLink={false} />
                <div className="min-w-0 text-left">
                  <div className="font-semibold truncate">
                    Round {r.roundIndex + 1}:{' '}
                    {r.title || (r._id ? 'Untitled' : 'Not written yet')}
                  </div>
                  <div className="text-xs text-ink-subtle">
                    by {r.creatorObject.userName} ·{' '}
                    <DateTime>{r.submissionStartDate}</DateTime>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="venue-card">
        <h3 className="venue-section-title">About {league.title}</h3>
        <p className="text-sm text-ink-muted leading-relaxed">
          <MultiLine>{league.description}</MultiLine>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {league.users.map((u) => (
            <Avatar key={u._id} user={u} size={8} includeTooltip />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <Stat value={league.numberOfRounds} label="Rounds" />
          <Stat value={league.users.length} label="Players" />
          <Stat value={`${league.daysForSubmission}d`} label="Submit" />
          <Stat value={`${league.daysForVoting}d`} label="Vote" />
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-black/5 py-2">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-subtle">
        {label}
      </div>
    </div>
  );
}

function StageDeadline({
  round,
}: {
  round: NonNullable<PanelProps['model']['currentRound']>;
}) {
  const deadline = (() => {
    switch (round.stage) {
      case 'submission':
        return { label: 'Submissions close in', at: round.submissionEndDate };
      case 'voting':
      case 'currentUserVotingCompleted':
        return { label: 'Voting closes in', at: round.votingEndDate };
      case 'upcoming':
        return { label: 'Opens in', at: round.submissionStartDate };
      default:
        return null;
    }
  })();
  if (!deadline) {
    return null;
  }
  return (
    <div className="mt-3 flex items-center justify-between rounded-xl bg-black/5 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
        {deadline.label}
      </span>
      <Countdown to={deadline.at} className="font-bold tabular-nums" />
    </div>
  );
}
