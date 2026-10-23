/**
 * The places you can walk to in the venue. Positions are in world units on
 * the floor plane (y is up). The room spans x/z from -ROOM_HALF to ROOM_HALF,
 * with walls along the back (z = -ROOM_HALF) and left (x = -ROOM_HALF).
 */

export const ROOM_HALF = 7;

export type StationId =
  | 'stage'
  | 'booth'
  | 'ballot'
  | 'lineup'
  | 'crates'
  | 'board'
  | 'jukebox'
  | 'exit';

export type Vec3 = [number, number, number];

export type Station = {
  id: StationId;
  label: string;
  // short verb-y hint (panel subtitles, accessibility)
  hint: string;
  // one-word dock label
  short: string;
  emoji: string;
  // neon color used for the station's glow, marker and dock icon
  color: string;
  // where the player stands when visiting
  approach: Vec3;
  // what the camera centres on when focused
  focus: Vec3;
  // how much closer than the overview the camera zooms
  zoom: number;
};

export const STATIONS: Record<StationId, Station> = {
  stage: {
    id: 'stage',
    short: 'Theme',
    label: 'Main Stage',
    hint: "This round's theme",
    emoji: '🎤',
    color: '#ff4fd8',
    approach: [0.5, 0, -2.6],
    focus: [0.5, 1.2, -4.6],
    zoom: 1.7,
  },
  booth: {
    id: 'booth',
    short: 'Submit',
    label: 'DJ Booth',
    hint: 'Submit your song',
    emoji: '💿',
    color: '#38e1ff',
    approach: [-3.6, 0, -0.6],
    focus: [-5.4, 1, -0.8],
    zoom: 2,
  },
  ballot: {
    id: 'ballot',
    short: 'Vote',
    label: 'Ballot Box',
    hint: 'Vote & guess',
    emoji: '🗳️',
    color: '#ffb547',
    approach: [3.4, 0, 3.6],
    focus: [4.6, 0.9, 4.4],
    zoom: 2.1,
  },
  lineup: {
    id: 'lineup',
    short: 'Ranks',
    label: 'Lineup Wall',
    hint: 'Standings',
    emoji: '🏆',
    color: '#ffe066',
    approach: [-4.4, 0, -4.2],
    focus: [-4.6, 1.8, -6.2],
    zoom: 1.9,
  },
  crates: {
    id: 'crates',
    short: 'Rounds',
    label: 'Record Crates',
    hint: 'All rounds',
    emoji: '📦',
    color: '#7dff9b',
    approach: [-4.4, 0, 3.4],
    focus: [-5.9, 1, 3.4],
    zoom: 2,
  },
  board: {
    id: 'board',
    short: 'Polls',
    label: 'Corkboard',
    hint: 'Polls',
    emoji: '📌',
    color: '#ff8a5c',
    approach: [4, 0, -1.2],
    focus: [5.4, 1.3, -1.4],
    zoom: 2.1,
  },
  jukebox: {
    id: 'jukebox',
    short: 'Recap',
    label: 'Jukebox',
    hint: 'League recap',
    emoji: '🎶',
    color: '#b78cff',
    approach: [4.6, 0, -4],
    focus: [5.6, 1.2, -5.6],
    zoom: 2,
  },
  exit: {
    id: 'exit',
    short: 'You',
    label: 'Exit',
    hint: 'Leagues & you',
    emoji: '🚪',
    color: '#ff5470',
    approach: [-4.8, 0, 6],
    focus: [-6.5, 1.4, 6],
    zoom: 2,
  },
};

export const STATION_ORDER: StationId[] = [
  'stage',
  'booth',
  'ballot',
  'lineup',
  'crates',
  'jukebox',
  'board',
  'exit',
];

export function isStationId(value: unknown): value is StationId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(STATIONS, value)
  );
}

// Where the player appears when they walk in.
export const SPAWN: Vec3 = [0.6, 0, 4.6];
