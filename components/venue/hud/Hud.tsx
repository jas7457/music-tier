'use client';

import Image from 'next/image';
import type { PopulatedLeague, PopulatedUser } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { logo } from '@/lib/utils/constants';
import { STATION_ORDER, STATIONS, StationId } from '../stations';
import type { VenueModel } from '../venueModel';
import { Countdown } from './Countdown';
import { SearchBar } from '@/components/SearchBar';
import { useState } from 'react';

/** Everything drawn over the 3D room: top bar, next-step prompt, dock. */
export function Hud({
  league,
  user,
  model,
  selected,
  isOpen,
  isWide,
  nearStation,
  onSelect,
}: {
  isWide: boolean;
  nearStation: StationId | null;
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
  const [searchOpen, setSearchOpen] = useState(false);

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="venue-round-button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label={searchOpen ? 'Close search' : 'Search songs, artists and rounds'}
            aria-expanded={searchOpen}
          >
            {searchOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="venue-avatar-button"
            onClick={() => onSelect('exit')}
            aria-label="You, your leagues and settings"
          >
            <Avatar user={user} size={10} includeLink={false} />
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="venue-search">
          <SearchBar />
        </div>
      )}

      <div
        className="venue-bottom"
        data-open={isOpen || undefined}
        // on phones the panel covers the dock: keep it out of the tab order
        inert={isOpen && !isWide}
      >
        {nearStation && !isOpen && (
          <button
            type="button"
            className="venue-near"
            style={
              { '--station-color': STATIONS[nearStation].color } as React.CSSProperties
            }
            onClick={() => onSelect(nearStation)}
          >
            <kbd>E</kbd>
            <span>
              {STATIONS[nearStation].emoji} Open {STATIONS[nearStation].label}
            </span>
          </button>
        )}
        {quest && !isOpen && !nearStation && (
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
                aria-label={`${station.label}: ${station.hint}`}
              >
                <span className="venue-dock-emoji" aria-hidden>
                  {station.emoji}
                </span>
                <span className="venue-dock-label">{station.short}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
