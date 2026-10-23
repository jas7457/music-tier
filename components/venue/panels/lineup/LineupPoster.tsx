'use client';

import { useMemo, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import AlbumArt from '@/components/AlbumArt';
import { Expandable } from '@/components/Expandable';
import { getPlaceString } from '@/lib/utils/getPlaces';
import { getRoundTitle } from '@/lib/utils/getRoundTitle';
import type { PopulatedUser } from '@/lib/types';
import type { PanelProps } from '../types';
import {
  buildBump,
  buildFanAndCritic,
  buildGuessStats,
  buildSetLists,
  sortCompleted,
  type SetListEntry,
} from './lineupData';
import './lineup.css';

type Act = PanelProps['model']['standings'][number];

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** The lineup wall, drawn like a festival gig poster. */
export function LineupPoster({ league, user, model }: PanelProps) {
  const [openActId, setOpenActId] = useState<string | null>(null);
  const rounds = useMemo(() => sortCompleted(league), [league]);
  const setLists = useMemo(() => buildSetLists(rounds), [rounds]);
  const bump = useMemo(() => buildBump(league, rounds), [league, rounds]);

  const acts = model.standings;
  const headliners = acts.filter((act) => act.place === 1);
  const coHeadliners = acts.filter((act) => act.place === 2 || act.place === 3);
  const guests = acts.filter((act) => act.place > 3);

  if (rounds.length === 0) {
    return (
      <div className="lineup-poster lineup-tba">
        <div className="lineup-kicker">{league.title} presents</div>
        <div className="lineup-tba-title">Lineup TBA</div>
        <div className="lineup-tba-sub">
          The bill is still being written. Finish a round and the first names
          go up on the wall.
        </div>
        <div className="lineup-tba-acts">
          {league.users.map((leagueUser) => (
            <div key={leagueUser._id} className="lineup-tba-act">
              <Avatar user={leagueUser} size={10} includeLink={false} />
              <span>???</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderAct = (act: Act, tier: 'head' | 'co' | 'guest') => (
    <ActRow
      key={act.user._id}
      act={act}
      tier={tier}
      isYou={act.user._id === user._id}
      isOpen={openActId === act.user._id}
      onToggle={() =>
        setOpenActId((current) =>
          current === act.user._id ? null : act.user._id,
        )
      }
      setList={setLists.get(act.user._id) ?? []}
    />
  );

  return (
    <div className="lineup-wrap">
      {league.status === 'completed' && <Encore league={league} me={user} acts={acts} />}

      <div className="lineup-poster">
        <div className="lineup-stars" aria-hidden />
        <div className="lineup-kicker">{league.title} presents</div>
        <div className="lineup-banner">
          <span>Live</span>
          <b>★</b>
          <span>
            {rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}
          </span>
          <b>★</b>
          <span>{acts.length} acts</span>
        </div>

        <div className="lineup-tier-label">Headlining</div>
        {headliners.map((act) => renderAct(act, 'head'))}

        {coHeadliners.length > 0 && (
          <>
            <div className="lineup-rule" />
            {coHeadliners.map((act) => renderAct(act, 'co'))}
          </>
        )}

        {guests.length > 0 && (
          <>
            <div className="lineup-rule" />
            <div className="lineup-tier-label">With special guests</div>
            <div className="lineup-guests">
              {guests.map((act) => renderAct(act, 'guest'))}
            </div>
          </>
        )}

        <div className="lineup-footer">
          Tap an act for their set list · no refunds
        </div>
      </div>

      {rounds.length > 1 && (
        <section>
          <h3 className="venue-section-title">Tour standings</h3>
          <BumpChart
            acts={acts}
            bump={bump}
            rounds={rounds.length}
            meId={user._id}
            highlightId={openActId}
          />
        </section>
      )}

      <GuessAccuracy league={league} me={user} />
    </div>
  );
}

function ActRow({
  act,
  tier,
  isYou,
  isOpen,
  onToggle,
  setList,
}: {
  act: Act;
  tier: 'head' | 'co' | 'guest';
  isYou: boolean;
  isOpen: boolean;
  onToggle: () => void;
  setList: SetListEntry[];
}) {
  const medal = MEDALS[act.place];
  const avatarSize = tier === 'head' ? 16 : tier === 'co' ? 12 : 9;
  return (
    <div className="lineup-act" data-tier={tier} data-open={isOpen}>
      <button
        type="button"
        className="lineup-act-head"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <Avatar
          user={act.user}
          size={avatarSize}
          includeLink={false}
          className="lineup-avatar"
        />
        <span className="lineup-act-main">
          <span className="lineup-act-name">
            {act.user.userName}
            {isYou && <em className="lineup-you">you</em>}
          </span>
          <span className="lineup-act-meta">
            {tier !== 'guest' && medal ? `${medal} ` : ''}
            {getPlaceString(act.place)}
            {act.wins > 0 && (
              <span className="lineup-crowns">
                {' · '}👑 ×{act.wins}
              </span>
            )}
          </span>
        </span>
        <span className="lineup-act-points">
          <b>{act.points}</b>
          <small>pts</small>
        </span>
      </button>
      <Expandable isExpanded={isOpen}>
        <SetList setList={setList} />
      </Expandable>
    </div>
  );
}

function SetList({ setList }: { setList: SetListEntry[] }) {
  return (
    <ol className="lineup-setlist">
      {setList.map((entry) => (
        <li key={entry.round._id} className="lineup-set">
          {entry.submission ? (
            <AlbumArt
              trackInfo={entry.submission.trackInfo}
              round={entry.round}
              size={52}
            />
          ) : (
            <div className="lineup-set-empty">—</div>
          )}
          <div className="lineup-set-body">
            <div className="lineup-set-round">
              R{entry.round.roundIndex + 1}
              {entry.round.isBonusRound && ' · Bonus'}
              {entry.round.isKickoffRound && ' · Kickoff'}
              {' · '}
              {getRoundTitle(entry.round, false)}
            </div>
            {entry.submission ? (
              <>
                <div className="lineup-set-song">
                  {entry.submission.trackInfo.title}
                </div>
                <div className="lineup-set-artist">
                  {entry.submission.trackInfo.artists.join(', ')}
                </div>
              </>
            ) : (
              <div className="lineup-set-artist">Sat this one out</div>
            )}
          </div>
          {entry.submission && (
            <div className="lineup-set-score">
              <b>{entry.points}</b>
              <small>
                {entry.place ? (MEDALS[entry.place] ?? getPlaceString(entry.place)) : ''}
              </small>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

const LINE_COLORS = [
  '#d6336c',
  '#1c7ed6',
  '#2f9e44',
  '#f08c00',
  '#7048e8',
  '#0c8599',
  '#c92a2a',
  '#5c940d',
  '#a61e4d',
  '#364fc7',
];

function BumpChart({
  acts,
  bump,
  rounds,
  meId,
  highlightId,
}: {
  acts: Act[];
  bump: Map<string, number[]>;
  rounds: number;
  meId: string;
  highlightId: string | null;
}) {
  const W = 340;
  const H = 150;
  const padX = 18;
  const padY = 14;
  const maxPlace = Math.max(
    1,
    ...Array.from(bump.values()).flatMap((places) => places),
  );
  const x = (i: number) => padX + (i * (W - padX * 2)) / Math.max(1, rounds - 1);
  const y = (place: number) =>
    padY + ((place - 1) * (H - padY * 2)) / Math.max(1, maxPlace - 1);
  const focusId = highlightId ?? meId;
  return (
    <div className="lineup-bump">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Places by round">
        {Array.from({ length: rounds }, (_, i) => (
          <g key={i}>
            <line className="lineup-bump-grid" x1={x(i)} x2={x(i)} y1={4} y2={H - 14} />
            <text className="lineup-bump-label" x={x(i)} y={H - 2} textAnchor="middle">
              R{i + 1}
            </text>
          </g>
        ))}
        {acts.map((act) => {
          const places = bump.get(act.user._id) ?? [];
          const color = LINE_COLORS[act.user.index % LINE_COLORS.length];
          const focused = act.user._id === focusId;
          const d = places
            .map((place, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(place)}`)
            .join(' ');
          return (
            <g key={act.user._id} opacity={focused ? 1 : 0.35}>
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={focused ? 3.5 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {places.map((place, i) => (
                <circle key={i} cx={x(i)} cy={y(place)} r={focused ? 4 : 2.5} fill={color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="lineup-bump-legend">
        {acts.map((act) => (
          <span key={act.user._id} data-focus={act.user._id === focusId}>
            <i style={{ background: LINE_COLORS[act.user.index % LINE_COLORS.length] }} />
            {act.user.userName}
          </span>
        ))}
      </div>
    </div>
  );
}

function Encore({
  league,
  me,
  acts,
}: {
  league: PanelProps['league'];
  me: PopulatedUser;
  acts: Act[];
}) {
  const { fan, critic } = useMemo(
    () => buildFanAndCritic(league, me),
    [league, me],
  );
  const mine = acts.find((act) => act.user._id === me._id);
  return (
    <div className="venue-card lineup-encore">
      <div className="lineup-encore-title">That&apos;s a wrap!</div>
      <p>The competition was fierce!</p>
      {mine && (
        <p>
          You finished <b>{league.title}</b> in{' '}
          <b>{getPlaceString(mine.place)} place</b> with{' '}
          <b>{mine.points} points</b>
        </p>
      )}
      <div className="lineup-encore-people">
        {fan && <Fan label="Your biggest fan" person={fan} />}
        {critic && <Fan label="Your biggest critic" person={critic} />}
      </div>
    </div>
  );
}

function Fan({
  label,
  person,
}: {
  label: string;
  person: { user: PopulatedUser; points: number };
}) {
  return (
    <div className="lineup-fan">
      <Avatar user={person.user} size={14} includeLink={false} />
      <div className="lineup-fan-label">{label}</div>
      <div className="lineup-fan-name">{person.user.userName}</div>
      <div className="lineup-fan-sub">
        {person.points} upvote{person.points !== 1 ? 's' : ''} for you
      </div>
    </div>
  );
}

function GuessAccuracy({
  league,
  me,
}: {
  league: PanelProps['league'];
  me: PopulatedUser;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const stats = useMemo(() => buildGuessStats(league), [league]);
  if (stats.length === 0) {
    return null;
  }
  return (
    <section>
      <h3 className="venue-section-title">Guess accuracy</h3>
      <div className="lineup-guess-list">
        {stats.map((stat, index) => {
          const isOpen = openId === stat.user._id;
          const byRound = new Map<string, typeof stat.guesses>();
          for (const guess of stat.guesses) {
            byRound.set(guess.round._id, [
              ...(byRound.get(guess.round._id) ?? []),
              guess,
            ]);
          }
          const who = stat.user._id === me._id ? 'you' : stat.user.userName;
          return (
            <div key={stat.user._id} className="venue-card lineup-guess">
              <button
                type="button"
                className="lineup-guess-head"
                onClick={() => setOpenId(isOpen ? null : stat.user._id)}
                aria-expanded={isOpen}
              >
                <span className="lineup-guess-rank">#{index + 1}</span>
                <Avatar user={stat.user} size={9} includeLink={false} />
                <span className="lineup-guess-who">
                  <b>{stat.user.userName}</b>
                  <small>
                    {stat.correctCount} correct • {stat.incorrectCount} incorrect
                  </small>
                </span>
                <span className="lineup-guess-acc">
                  <b>{Math.round(stat.accuracy)}%</b>
                  <small>accuracy</small>
                </span>
              </button>
              <Expandable isExpanded={isOpen}>
                <div className="lineup-guess-body">
                  {Array.from(byRound.values()).map((guesses) => (
                    <div key={guesses[0].round._id}>
                      <div className="lineup-guess-round">
                        {getRoundTitle(guesses[0].round)}
                      </div>
                      {guesses.map((guess) => (
                        <div
                          key={guess.submission._id}
                          className="lineup-guess-item"
                          data-correct={guess.isCorrect}
                        >
                          <div className="lineup-guess-verdict">
                            {guess.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                          </div>
                          <div className="lineup-guess-row">
                            <AlbumArt
                              trackInfo={guess.submission.trackInfo}
                              round={guess.round}
                              size={48}
                            />
                            <div className="lineup-guess-info">
                              <b>{guess.submission.trackInfo.title}</b>
                              <small>
                                {guess.submission.trackInfo.artists.join(', ')}
                              </small>
                              <span>
                                <Avatar
                                  user={guess.actualUser}
                                  size={5}
                                  includeLink={false}
                                />
                                <Avatar
                                  user={guess.guessedUser}
                                  size={5}
                                  includeLink={false}
                                />
                                Submitted by {guess.actualUser.userName}, {who}{' '}
                                guessed {guess.guessedUser.userName}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Expandable>
            </div>
          );
        })}
      </div>
    </section>
  );
}
