'use client';

import dynamic from 'next/dynamic';
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PopulatedLeague, PopulatedPoll, PopulatedUser } from '@/lib/types';
import type { LeagueSummary } from '@/lib/data';
import { useRealTimeUpdates } from '@/lib/PusherContext';
import { getLeagueRefreshBoundaries } from '@/lib/utils/getRefreshBoundaries';
import {
  isStationId,
  STATIONS,
  StationId,
  Vec3,
} from './stations';
import { buildVenueModel } from './venueModel';
import { Sheet, SheetSize } from './hud/Sheet';
import { Hud } from './hud/Hud';
import { SceneOverlay } from './hud/SceneOverlay';
import { StagePanel } from './panels/StagePanel';
import { BoothPanel } from './panels/BoothPanel';
import { BallotPanel } from './panels/BallotPanel';
import { LineupPanel } from './panels/LineupPanel';
import { CratesPanel } from './panels/CratesPanel';
import { JukeboxPanel } from './panels/JukeboxPanel';
import { BoardPanel } from './panels/BoardPanel';
import { ExitPanel } from './panels/ExitPanel';
import type { PanelProps } from './panels/types';
import type { StationSceneData } from './scene/Stations';
import { getRoundTitle } from '@/lib/utils/getRoundTitle';
import { isTyping } from './scene/keyboard';
import { EMOTES, express } from './expressions';
import { useLivePresence, useOnline } from './live';
import { openSelfMenu } from './hud/Expressions';
import './venue.css';

const VenueCanvas = dynamic(() => import('./scene/VenueCanvas'), {
  ssr: false,
  loading: () => <VenueLoading />,
});

function VenueLoading() {
  return (
    <div className="venue-loading">
      <div className="venue-loading-disc" />
      <span>Opening the doors…</span>
    </div>
  );
}

type Location = { station: StationId | null; roundId: string | null };

function readLocation(): Location | null {
  const params = new URLSearchParams(window.location.search);
  const at = params.get('at');
  if (!params.has('at')) {
    return null;
  }
  return {
    station: isStationId(at) ? at : null,
    roundId: params.get('round'),
  };
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export function Venue({
  league,
  user,
  otherLeagues = [],
  polls = null,
  initialStation = null,
  initialRoundId = null,
}: {
  league: PopulatedLeague;
  user: PopulatedUser;
  otherLeagues?: LeagueSummary[];
  polls?: PopulatedPoll[] | null;
  initialStation?: StationId | null;
  initialRoundId?: string | null;
}) {
  useRealTimeUpdates(getLeagueRefreshBoundaries(league));
  // who's here right now (Pusher presence); harmless if unavailable
  useLivePresence(league._id, user._id);
  const online = useOnline();

  const model = useMemo(() => buildVenueModel(league, user), [league, user]);
  const me = model.friends.find((friend) => friend.isYou) ?? {
    user,
    isYou: true,
    isDone: true,
    status: '',
    place: null,
    points: 0,
  };

  const [location, setLocation] = useState<Location>({
    station: initialStation,
    roundId: initialRoundId,
  });
  const [sheetSize, setSheetSize] = useState<SheetSize>('half');
  const [destination, setDestination] = useState<Vec3 | null>(
    initialStation ? [...STATIONS[initialStation].approach] : null,
  );
  const [cover, setCover] = useState({ bottom: 0, right: 0 });
  // the station you've walked up to with the keyboard
  const [nearStation, setNearStation] = useState<StationId | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const isWide = useMediaQuery('(min-width: 768px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Ask for notification permission on the first tap (browsers require a
  // user gesture), as the old home page did.
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') {
      return;
    }
    const requestPermission = () => {
      Notification.requestPermission();
    };
    document.addEventListener('click', requestPermission, { once: true });
    return () => document.removeEventListener('click', requestPermission);
  }, []);

  // How many history entries the venue has pushed on top of the page's own
  // entry, so closing can go back instead of piling up entries.
  const pushedRef = useRef(0);

  // the page's deep-link station, as first rendered
  const [initial] = useState({ station: initialStation, roundId: initialRoundId });

  // T to talk, 1-6 to emote (when you're not typing somewhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) {
        return;
      }
      if (e.code === 'KeyT') {
        e.preventDefault();
        openSelfMenu(user._id, { typing: true });
        return;
      }
      const digit = /^Digit([1-9])$/.exec(e.code);
      const emote = digit ? EMOTES[Number(digit[1]) - 1] : undefined;
      if (emote) {
        express(user._id, { kind: 'emote', emote: emote.id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user._id]);

  // the URL (?at=booth&round=…) is the source of truth for back/forward
  useEffect(() => {
    const fromUrl = readLocation();
    if (!fromUrl && initial.station) {
      // deep links (/leagues/x/rounds/y) open a station: put it in the URL
      // so refresh and back agree with what's on screen
      const url = new URL(window.location.href);
      url.searchParams.set('at', initial.station);
      if (initial.roundId) {
        url.searchParams.set('round', initial.roundId);
      }
      window.history.replaceState(null, '', url);
    }
    if (fromUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(fromUrl);
      if (fromUrl.station) {
        setDestination([...STATIONS[fromUrl.station].approach]);
      }
    }
    const onPop = () => {
      pushedRef.current = Math.max(0, pushedRef.current - 1);
      const next = readLocation() ?? { station: null, roundId: null };
      setLocation(next);
      if (next.station) {
        setDestination([...STATIONS[next.station].approach]);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [initial]);

  const navigate = useCallback((next: Location, replace = false) => {
    setLocation(next);
    const url = new URL(window.location.href);
    if (next.station) {
      url.searchParams.set('at', next.station);
    } else {
      url.searchParams.delete('at');
    }
    if (next.roundId) {
      url.searchParams.set('round', next.roundId);
    } else {
      url.searchParams.delete('round');
    }
    // Pass null state: Next.js syncs its router with native history calls
    // only when the state isn't its own, so router.refresh() keeps ?at=.
    if (replace) {
      window.history.replaceState(null, '', url);
    } else {
      pushedRef.current += 1;
      window.history.pushState(null, '', url);
    }
  }, []);

  const goTo = useCallback(
    (station: StationId) => {
      setDestination([...STATIONS[station].approach]);
      setSheetSize('half');
      navigate({ station, roundId: null }, location.station !== null);
    },
    [navigate, location.station],
  );

  const goToRef = useRef(goTo);
  useEffect(() => {
    goToRef.current = goTo;
  }, [goTo]);

  // E (or Enter) opens the station you're standing at
  useEffect(() => {
    if (!nearStation || location.station) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) {
        return;
      }
      const onControl = (e.target as HTMLElement | null)?.closest?.(
        'button, a, [role="button"]',
      );
      if (e.code === 'KeyE' || (e.code === 'Enter' && !onControl)) {
        e.preventDefault();
        goToRef.current(nearStation);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearStation, location.station]);


  const openRound = useCallback(
    (roundId: string) => {
      setDestination([...STATIONS.crates.approach]);
      navigate({ station: 'crates', roundId });
    },
    [navigate],
  );

  const close = useCallback(() => {
    if (pushedRef.current > 0) {
      // back to the entry we started from; popstate syncs the state
      const steps = pushedRef.current;
      // the single popstate this fires decrements it to 0
      pushedRef.current = 1;
      window.history.go(-steps);
      setLocation({ station: null, roundId: null });
      return;
    }
    navigate({ station: null, roundId: null }, true);
  }, [navigate]);

  const station = location.station ? STATIONS[location.station] : null;

  const sceneData: StationSceneData = useMemo(() => {
    const round = model.currentRound;
    return {
      heroImageUrl: league.heroImageUrl ?? null,
      heroFocal: [league.heroImageFocalX ?? 50, league.heroImageFocalY ?? 50],
      marqueeTitle: round
        ? getRoundTitle(round, false)
        : league.status === 'completed'
          ? 'That’s a wrap!'
          : league.title,
      marqueeSubtitle: round
        ? `ROUND ${round.roundIndex + 1} · ${model.theme.label.toUpperCase()}`
        : league.title.toUpperCase(),
      moodColor: model.theme.color,
      spinningArt: model.spinningTrackArt,
      leagueTitle: league.title,
      podium: model.standings
        .filter((s) => s.points > 0)
        .slice(0, 3)
        .map((s) => ({
          name: s.user.firstName || s.user.userName,
          photoUrl: s.user.photoUrl,
          colorIndex: s.user.index,
          place: s.place,
          points: s.points,
        })),
      lineup: model.standings
        .filter((s) => s.points > 0)
        .slice(0, 9)
        .map((s) => ({
          name: s.user.firstName || s.user.userName,
          points: s.points,
          place: s.place,
        })),
      crateArt: [...league.rounds.completed]
        .sort((a, b) => b.submissionStartDate - a.submissionStartDate)
        .flatMap((round) => {
          const top = round.submissions
            .map((s) => ({
              s,
              points: round.votes
                .filter((v) => v.submissionId === s._id)
                .reduce((sum, v) => sum + v.points, 0),
            }))
            .sort((a, b) => b.points - a.points)[0];
          return top ? [top.s.trackInfo.albumImageUrl] : [];
        }),
      pollCount: polls?.length ?? 0,
      openPollCount:
        polls?.filter((p) => p.status === 'open' && !p.hasVoted).length ?? 0,
      hasRecap: Boolean(league.playback),
      ballotDone: model.currentRound?.stage === 'currentUserVotingCompleted',
      questStation: model.quest?.urgent ? model.quest.station : null,
    };
  }, [model, league, polls]);

  const panelProps: PanelProps = {
    league,
    user,
    model,
    polls,
    otherLeagues,
    goTo,
    openRound,
  };

  const panel = (() => {
    switch (location.station) {
      case 'stage':
        return <StagePanel {...panelProps} />;
      case 'booth':
        return <BoothPanel {...panelProps} />;
      case 'ballot':
        return <BallotPanel {...panelProps} />;
      case 'lineup':
        return <LineupPanel {...panelProps} />;
      case 'crates':
        return <CratesPanel {...panelProps} roundId={location.roundId} />;
      case 'jukebox':
        return <JukeboxPanel {...panelProps} />;
      case 'board':
        return <BoardPanel {...panelProps} />;
      case 'exit':
        return <ExitPanel {...panelProps} />;
      default:
        return null;
    }
  })();

  const sheetTitle = (() => {
    if (location.station === 'crates' && location.roundId) {
      const round = model.allRounds.find((r) => r._id === location.roundId);
      if (round) {
        // the sleeve shows the theme big; the header just says which round
        return round.title && !round.isHidden
          ? getRoundTitle(round)
          : `Round ${round.roundIndex + 1}`;
      }
    }
    return station?.label ?? '';
  })();

  const isOpen = Boolean(station);
  // centre the camera on the part of the screen nothing covers
  const screenOffset = isOpen
    ? isWide
      ? { x: -cover.right / 2, y: 0 }
      : { x: 0, y: cover.bottom / 2 - 24 }
    : { x: 0, y: isWide ? 10 : 25 };

  return (
    <div className="venue-root" data-open={isOpen || undefined}>
      <div className="venue-canvas">
        {webglFailed ? (
          <div className="venue-loading">
            <span>3D isn&apos;t available here, but every room is in the menu below.</span>
          </div>
        ) : (
          <CanvasBoundary onError={() => setWebglFailed(true)}>
            <VenueCanvas
              sceneData={sceneData}
              friends={model.friends}
              me={me}
              focus={station ? { point: station.focus, zoom: station.zoom } : null}
              screenOffset={screenOffset}
              destination={destination}
              paused={isOpen && !isWide && sheetSize === 'full'}
              reducedMotion={reducedMotion}
              onSelectStation={goTo}
              onNearStation={setNearStation}
              openStation={location.station}
              online={online}
              onLeaveStation={close}
              onFloorTap={(point) => {
                setDestination(point);
                if (isOpen) {
                  close();
                }
              }}
            />
          </CanvasBoundary>
        )}
      </div>

      {!webglFailed && (
        <SceneOverlay
          showLabels={!isOpen}
          questStation={sceneData.questStation}
          badges={
            sceneData.openPollCount > 0
              ? { board: String(sceneData.openPollCount) }
              : {}
          }
          friends={model.friends}
          online={online}
          onSelect={goTo}
        />
      )}

      <Hud
        league={league}
        user={user}
        model={model}
        selected={location.station}
        isOpen={isOpen}
        isWide={isWide}
        onlineCount={online.size}
        nearStation={location.station ? null : nearStation}
        onSelect={goTo}
      />

      <Sheet
        open={isOpen}
        isWide={isWide}
        size={sheetSize}
        onSizeChange={setSheetSize}
        onClose={close}
        onCoverChange={setCover}
        title={sheetTitle}
        emoji={station?.emoji ?? ''}
        color={station?.color ?? '#fff'}
        onBack={
          location.station === 'crates' && location.roundId
            ? () => navigate({ station: 'crates', roundId: null })
            : undefined
        }
      >
        {panel}
      </Sheet>
    </div>
  );
}

class CanvasBoundary extends Component<
  { children: React.ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('Venue 3D failed', error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
