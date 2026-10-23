'use client';

import Image from 'next/image';
import type { PopulatedLeague, PopulatedUser } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { logo } from '@/lib/utils/constants';
import { STATION_ORDER, STATIONS, StationId } from '../stations';
import type { VenueModel } from '../venueModel';
import { Countdown } from './Countdown';

/** Everything drawn over the 3D room: top bar, next-step prompt, dock. */
export function Hud({
  league,
  user,
  model,
  selected,
  isOpen,
  onSelect,
}: {
  league: PopulatedLeague;
  user: PopulatedUser;
  model: VenueModel;
  selected: StationId | null;
  isOpen: boolean;
  onSelect: (id: StationId) => void;
}) {
  const round = model.currentRound;
  const deadline = (() => {
    switch (round?.stage) {
      case 'submission':
        return round.submissionEndDate;
      case 'voting':
      case 'currentUserVotingCompleted':
        return round.votingEndDate;
      case 'upcoming':
        return round.submissionStartDate;
      default:
        return null;
    }
  })();
  const quest = model.quest;

  return (
    <>
      <header className="venue-topbar">
        <button
          type="button"
          className="venue-pill venue-title-pill"
          onClick={() => onSelect('stage')}
        >
          <Image
            src={logo.src}
            alt=""
            width={logo.width}
            height={logo.height}
            className="h-7 w-auto"
          />
          <span className="min-w-0 text-left">
            <span className="block truncate font-bold leading-tight">
              {league.title}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] leading-tight opacity-80">
              <span
                className="venue-dot"
                style={{ background: model.theme.color }}
              />
              {round
                ? `R${round.roundIndex + 1} · ${model.theme.label}`
                : model.theme.label}
              {deadline && (
                <>
                  {' · '}
                  <Countdown to={deadline} />
                </>
              )}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="venue-avatar-button"
          onClick={() => onSelect('exit')}
          aria-label="You, your leagues and settings"
        >
          <Avatar user={user} size={10} includeLink={false} />
        </button>
      </header>

      <div className="venue-bottom" data-open={isOpen || undefined}>
        {quest && !isOpen && (
          <button
            type="button"
            className="venue-quest"
            data-urgent={quest.urgent || undefined}
            style={
              {
                '--station-color': STATIONS[quest.station].color,
              } as React.CSSProperties
            }
            onClick={() => onSelect(quest.station)}
          >
            <span className="venue-quest-icon" aria-hidden>
              {STATIONS[quest.station].emoji}
            </span>
            <span className="min-w-0 text-left">
              <span className="block font-bold truncate">{quest.title}</span>
              <span className="block text-xs opacity-75 truncate">
                {quest.detail}
              </span>
            </span>
            <span className="venue-quest-go" aria-hidden>
              →
            </span>
          </button>
        )}
        <nav className="venue-dock" aria-label="Rooms">
          {STATION_ORDER.map((id) => {
            const station = STATIONS[id];
            return (
              <button
                key={id}
                type="button"
                className="venue-dock-item"
                data-selected={selected === id || undefined}
                data-quest={(quest?.urgent && quest.station === id) || undefined}
                style={{ '--station-color': station.color } as React.CSSProperties}
                onClick={() => onSelect(id)}
              >
                <span className="venue-dock-emoji" aria-hidden>
                  {station.emoji}
                </span>
                <span className="venue-dock-label">{station.hint}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
