import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Round, User } from '@/databaseTypes';
import { addLeague, addRound, addUser, id, resetDb } from '../fixtures';
import { fakeDb } from '../fakeMongo';

const mocks = vi.hoisted(() => ({
  session: null as { userId: string } | null,
  triggerRealTimeUpdate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  verifySessionToken: async () => mocks.session,
}));
vi.mock('@/lib/pusher-server', () => ({
  triggerRealTimeUpdate: mocks.triggerRealTimeUpdate,
}));

import { POST } from '@/app/api/spotify/playlist/route';

/* ------------------------- a tiny fake Spotify --------------------------- */

type FakePlaylist = { owner: string; uris: string[] };

const spotify = {
  playlists: new Map<string, FakePlaylist>(),
  // spotify user id -> playlist ids they follow (their library)
  libraries: new Map<string, Set<string>>(),
  created: 0,
  // set to make every GET /playlists/{id} fail with this status
  lookupStatus: null as number | null,
  // runs when a playlist is created (to simulate a race)
  onCreate: null as null | (() => void),
};

function library(user: string) {
  let set = spotify.libraries.get(user);
  if (!set) {
    set = new Set();
    spotify.libraries.set(user, set);
  }
  return set;
}

/** A playlist `owner` made; `deleted` = they've since removed it. */
function addPlaylist(playlistId: string, owner: string, deleted = false) {
  spotify.playlists.set(playlistId, { owner, uris: [] });
  if (!deleted) {
    library(owner).add(playlistId);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function fakeSpotify(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(String(input));
  const method = init?.method ?? 'GET';
  const token = new Headers(init?.headers).get('Authorization') ?? '';
  const me = token.replace('Bearer token-', '');
  const path = url.pathname.replace('/v1', '');

  if (method === 'POST' && path === '/me/playlists') {
    const playlistId = `new-${++spotify.created}`;
    addPlaylist(playlistId, me);
    spotify.onCreate?.();
    return json({ id: playlistId }, 201);
  }
  const items = /^\/playlists\/([^/]+)\/items$/.exec(path);
  if (method === 'POST' && items) {
    const body = JSON.parse(String(init?.body));
    spotify.playlists.get(items[1])!.uris.push(...body.uris);
    return json({ snapshot_id: 'snap' }, 201);
  }
  if (method === 'GET' && path === '/me/library/contains') {
    const uris = url.searchParams.get('uris')!.split(',');
    return json(
      uris.map((uri) => library(me).has(uri.replace('spotify:playlist:', ''))),
    );
  }
  const get = /^\/playlists\/([^/]+)$/.exec(path);
  if (method === 'GET' && get) {
    if (spotify.lookupStatus) {
      return json({ error: { message: 'nope' } }, spotify.lookupStatus);
    }
    const playlist = spotify.playlists.get(get[1]);
    return playlist
      ? json({ id: get[1], owner: { id: playlist.owner } })
      : json({ error: { status: 404, message: 'Not found' } }, 404);
  }
  throw new Error(`fake Spotify: unexpected ${method} ${url}`);
}

/* ------------------------------- helpers --------------------------------- */

const SONGS = ['spotify:track:a', 'spotify:track:b'];

async function open(user: User, round: Round) {
  mocks.session = { userId: id(user) };
  const request = new NextRequest('http://localhost/api/spotify/playlist', {
    method: 'POST',
    headers: { cookie: `spotify_access_token=token-${user.spotifyId}` },
    body: JSON.stringify({
      name: 'Playlist Party - Test',
      description: 'A Playlist Party playlist',
      roundId: id(round),
      songs: SONGS,
    }),
  });
  const response = await POST(request);
  return { status: response.status, body: await response.json() };
}

function savedPlaylistId(round: Round) {
  return fakeDb
    .collection<Round>('rounds')
    .docs.find((doc) => doc._id.equals(round._id))?.spotifyPlaylistId;
}

let alice: User;
let bob: User;
let round: Round;

beforeEach(() => {
  resetDb();
  spotify.playlists.clear();
  spotify.libraries.clear();
  spotify.created = 0;
  spotify.lookupStatus = null;
  spotify.onCreate = null;
  mocks.triggerRealTimeUpdate.mockClear();
  vi.stubGlobal('fetch', vi.fn(fakeSpotify));

  alice = addUser({ spotifyId: 'alice' });
  bob = addUser({ spotifyId: 'bob' });
  const league = addLeague([alice, bob]);
  round = addRound(league, alice);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* -------------------------------- tests ---------------------------------- */

describe('POST /api/spotify/playlist', () => {
  it("makes the round's first playlist and saves it", async () => {
    const { status, body } = await open(alice, round);

    expect(status).toBe(200);
    expect(body.playlistId).toBe('new-1');
    expect(savedPlaylistId(round)).toBe('new-1');
    expect(spotify.playlists.get('new-1')!.uris).toEqual(SONGS);
    expect(mocks.triggerRealTimeUpdate).toHaveBeenCalled();
  });

  it('opens the saved playlist when it still exists', async () => {
    addPlaylist('old', 'alice');
    fakeDb.collection<Round>('rounds').docs[0].spotifyPlaylistId = 'old';

    const { body } = await open(bob, round);

    expect(body.playlistId).toBe('old');
    expect(spotify.created).toBe(0);
    expect(mocks.triggerRealTimeUpdate).not.toHaveBeenCalled();
  });

  it('remakes the playlist when Spotify no longer has it', async () => {
    fakeDb.collection<Round>('rounds').docs[0].spotifyPlaylistId = 'gone';

    const { body } = await open(bob, round);

    expect(body.playlistId).toBe('new-1');
    expect(body.recreated).toBe(true);
    expect(savedPlaylistId(round)).toBe('new-1');
    expect(spotify.playlists.get('new-1')).toEqual({
      owner: 'bob',
      uris: SONGS,
    });
  });

  it('remakes the playlist when its owner deleted it and opens it', async () => {
    addPlaylist('old', 'alice', true);
    fakeDb.collection<Round>('rounds').docs[0].spotifyPlaylistId = 'old';

    const { body } = await open(alice, round);

    expect(body.playlistId).toBe('new-1');
    expect(savedPlaylistId(round)).toBe('new-1');
  });

  it("can't tell a non-owner the owner deleted it, so opens it as is", async () => {
    addPlaylist('old', 'alice', true);
    fakeDb.collection<Round>('rounds').docs[0].spotifyPlaylistId = 'old';

    const { body } = await open(bob, round);

    expect(body.playlistId).toBe('old');
    expect(spotify.created).toBe(0);
  });

  it("doesn't make a duplicate when Spotify is having trouble", async () => {
    addPlaylist('old', 'alice');
    fakeDb.collection<Round>('rounds').docs[0].spotifyPlaylistId = 'old';

    for (const status of [429, 500, 401]) {
      spotify.lookupStatus = status;
      const { body } = await open(bob, round);
      expect(body.playlistId).toBe('old');
    }
    expect(spotify.created).toBe(0);
  });

  it('keeps the playlist someone else saved while we were making ours', async () => {
    fakeDb.collection<Round>('rounds').docs[0].spotifyPlaylistId = 'gone';
    spotify.onCreate = () => {
      fakeDb.collection<Round>('rounds').docs[0].spotifyPlaylistId = 'theirs';
    };

    const { body } = await open(bob, round);

    expect(body.playlistId).toBe('theirs');
    expect(savedPlaylistId(round)).toBe('theirs');
  });

  it("refuses people who aren't in the round's league", async () => {
    const stranger = addUser({ spotifyId: 'stranger' });

    const { status } = await open(stranger, round);

    expect(status).toBe(403);
    expect(spotify.created).toBe(0);
    expect(savedPlaylistId(round)).toBeUndefined();
  });
});
