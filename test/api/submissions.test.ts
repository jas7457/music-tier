import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Round, SongSubmission, TrackInfo, User } from '@/databaseTypes';
import {
  addLeague,
  addRound,
  addSubmission,
  addUsers,
  addVote,
  et,
  id,
  playRoundInSlot,
  resetDb,
  setNow,
} from '../fixtures';
import { fakeDb } from '../fakeMongo';

const mocks = vi.hoisted(() => ({
  session: null as { userId: string } | null,
  submissionNotifications: vi.fn(async () => {}),
  setScheduledNotifications: vi.fn(async () => {}),
  triggerRealTimeUpdate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  verifySessionToken: async () => mocks.session,
}));
vi.mock('@/lib/notifications', () => ({
  submissionNotifications: mocks.submissionNotifications,
}));
vi.mock('@/lib/scheduledNotifications', () => ({
  setScheduledNotifications: mocks.setScheduledNotifications,
}));
vi.mock('@/lib/pusher-server', () => ({
  triggerRealTimeUpdate: mocks.triggerRealTimeUpdate,
}));

import { POST, PUT } from '@/app/api/rounds/[roundId]/submissions/route';

type Body = {
  trackInfo?: Partial<TrackInfo>;
  note?: string;
  youtubeURL?: string;
  force?: boolean;
};

async function send(
  method: 'POST' | 'PUT',
  user: User | null,
  roundId: string,
  body: Body,
) {
  mocks.session = user ? { userId: id(user) } : null;
  const request = new NextRequest(
    `http://localhost/api/rounds/${roundId}/submissions`,
    { method, body: JSON.stringify(body) },
  );
  const handler = method === 'POST' ? POST : PUT;
  const response = await handler(request, {
    params: Promise.resolve({ roundId }),
  });
  return { status: response.status, body: await response.json() };
}

const track = (
  title: string,
  artists: string[],
  trackId = `${title}|${artists.join()}`,
): TrackInfo => ({
  trackId,
  title,
  artists,
  albumName: 'Album',
  albumImageUrl: '',
});

const FRESH = track('Fresh Song', ['New Artist']);
const HEY_JUDE = track('Hey Jude', ['The Beatles'], 'spotify-hey-jude');

/** During round 2's submission window. */
const OPEN_TIME = et('2025-06-08T09:00');

const savedSubmissions = () =>
  fakeDb.collection<SongSubmission>('songSubmissions').docs;

let alice: User, bob: User, carol: User;
/** Round 1 is complete, round 2 (Bob's) is open for submissions. */
let finished: Round, open: Round, upcoming: Round;

beforeEach(() => {
  resetDb();
  vi.clearAllMocks();
  [alice, bob, carol] = addUsers(3);
  const users = [alice, bob, carol];
  const league = addLeague(users);
  [finished, open, upcoming] = users.map((u) => addRound(league, u));
  playRoundInSlot(finished, users, 0);
  setNow(et('2025-06-08T12:00'));
});

describe('request checks', () => {
  it('rejects requests without a session', async () => {
    const result = await send('POST', null, id(open), { trackInfo: FRESH });
    expect(result.status).toBe(401);
  });

  it('requires a track', async () => {
    const result = await send('POST', alice, id(open), {
      trackInfo: { title: 'No id' },
    });
    expect(result.status).toBe(400);
  });

  it("404s for a round in a league the user isn't in", async () => {
    const [outsider] = addUsers(1);
    const result = await send('POST', outsider, id(open), {
      trackInfo: FRESH,
    });
    expect(result.status).toBe(404);
  });

  it.each([
    ['upcoming', () => upcoming],
    ['completed', () => finished],
  ])('refuses submissions to a round that is %s', async (stage, getRound) => {
    const result = await send('POST', alice, id(getRound()), {
      trackInfo: FRESH,
    });
    expect(result.status).toBe(403);
    expect(result.body.error).toContain(`"${stage}"`);
  });
});

describe('adding and updating', () => {
  it('saves a new submission and notifies', async () => {
    const result = await send('POST', alice, id(open), {
      trackInfo: FRESH,
      note: 'a banger',
      youtubeURL: 'https://youtu.be/x',
    });

    expect(result.status).toBe(200);
    const saved = savedSubmissions().filter((s) => s.roundId === id(open));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      userId: id(alice),
      trackInfo: FRESH,
      note: 'a banger',
      youtubeURL: 'https://youtu.be/x',
      submissionDate: et('2025-06-08T12:00'),
    });
    expect(mocks.submissionNotifications).toHaveBeenCalledOnce();
    expect(mocks.setScheduledNotifications).toHaveBeenCalledOnce();
    expect(mocks.triggerRealTimeUpdate).toHaveBeenCalledOnce();
  });

  it('refuses a second POST from the same user', async () => {
    addSubmission(open, alice, {
      submissionDate: OPEN_TIME,
      trackInfo: FRESH,
    });
    const result = await send('POST', alice, id(open), {
      trackInfo: track('Other', ['Someone']),
    });
    expect(result.status).toBe(409);
  });

  it('updates an existing submission with PUT, without new-submission notifications', async () => {
    addSubmission(open, alice, {
      submissionDate: OPEN_TIME,
      trackInfo: FRESH,
      youtubeURL: 'https://youtu.be/old',
    });
    const replacement = track('Better Song', ['Another Artist']);

    const result = await send('PUT', alice, id(open), {
      trackInfo: replacement,
      note: 'changed my mind',
    });

    expect(result.status).toBe(200);
    const saved = savedSubmissions().filter((s) => s.roundId === id(open));
    expect(saved).toHaveLength(1);
    expect(saved[0].trackInfo).toEqual(replacement);
    expect(saved[0].note).toBe('changed my mind');
    // Leaving out the YouTube link clears it.
    expect(saved[0]).not.toHaveProperty('youtubeURL');
    expect(mocks.submissionNotifications).not.toHaveBeenCalled();
    expect(mocks.setScheduledNotifications).toHaveBeenCalledOnce();
  });

  it("doesn't flag your own submission as a duplicate when updating it", async () => {
    addSubmission(open, alice, {
      submissionDate: OPEN_TIME,
      trackInfo: HEY_JUDE,
    });
    const result = await send('PUT', alice, id(open), {
      trackInfo: HEY_JUDE,
      note: 'same song, new note',
    });
    expect(result.status).toBe(200);
  });
});

describe('duplicates in the same round', () => {
  beforeEach(() => {
    addSubmission(open, bob, {
      submissionDate: OPEN_TIME,
      trackInfo: HEY_JUDE,
    });
  });

  const aliceSubmissions = () =>
    savedSubmissions().filter(
      (s) => s.roundId === id(open) && s.userId === id(alice),
    );

  it('blocks a song someone else already submitted, even with force', async () => {
    for (const force of [false, true]) {
      const result = await send('POST', alice, id(open), {
        trackInfo: HEY_JUDE,
        force,
      });
      expect(result.status).toBe(409);
    }
    expect(aliceSubmissions()).toHaveLength(0);
  });

  it('blocks the same title by a shared artist, even as a different Spotify track', async () => {
    const result = await send('POST', alice, id(open), {
      trackInfo: track('Hey Jude', ['The Beatles'], 'spotify-other-id'),
    });
    expect(result.status).toBe(409);
  });

  it.each([
    [
      'TITLE_AND_ARTIST_MATCH',
      track('Hey Jude - 2015 Remaster', ['The Beatles']),
    ],
    ['ARTIST_MATCH', track('Let It Be', ['The Beatles'])],
  ])('warns about a %s, and saves when forced', async (code, trackInfo) => {
    const warning = await send('POST', alice, id(open), { trackInfo });
    expect(warning.status).toBe(200);
    expect(warning.body).toMatchObject({
      success: false,
      code,
      trackInfo: HEY_JUDE,
    });
    expect(aliceSubmissions()).toHaveLength(0);

    const forced = await send('POST', alice, id(open), {
      trackInfo,
      force: true,
    });
    expect(forced.body.submission).toBeDefined();
    expect(aliceSubmissions()).toHaveLength(1);
  });
});

describe('songs from earlier rounds', () => {
  // In round 1 everyone submitted "<Name>'s song" by "<Name>'s band".
  const carolsEarlierSong = () =>
    savedSubmissions().find(
      (s) => s.roundId === id(finished) && s.userId === id(carol),
    )!.trackInfo;

  it('warns that the song was already submitted, and saves when forced', async () => {
    const trackInfo = { ...carolsEarlierSong(), trackId: 'a-different-id' };

    const warning = await send('POST', alice, id(open), { trackInfo });
    expect(warning.body).toEqual({
      success: false,
      code: 'PREVIOUSLY_SUBMITTED',
      trackInfo: carolsEarlierSong(),
      variant: 'SONG',
    });

    const forced = await send('POST', alice, id(open), {
      trackInfo,
      force: true,
    });
    expect(forced.body.submission).toBeDefined();
  });

  it('warns that the artist was already submitted', async () => {
    const trackInfo = track('A New One', carolsEarlierSong().artists);

    const warning = await send('POST', alice, id(open), { trackInfo });

    expect(warning.body).toMatchObject({
      code: 'PREVIOUSLY_SUBMITTED',
      variant: 'ARTIST',
    });
  });

  it("catches songs from people who didn't vote in a finished round", async () => {
    // Finished rounds only list songs from people who voted, so this check
    // has to read submissions from the database directly.
    const [dave] = addUsers(1);
    const otherLeague = addLeague([alice, dave], {
      title: 'Other',
      leagueStartDate: et('2025-03-03T00:00'),
    });
    const oldRound = addRound(otherLeague, dave);
    addSubmission(oldRound, dave, {
      submissionDate: et('2025-03-03T09:00'),
      trackInfo: HEY_JUDE,
    });

    const warning = await send('POST', alice, id(open), {
      trackInfo: HEY_JUDE,
    });

    expect(warning.body).toMatchObject({
      code: 'PREVIOUSLY_SUBMITTED',
      variant: 'SONG',
      trackInfo: HEY_JUDE,
    });
  });

  it('checks rounds in your other leagues too', async () => {
    const otherLeague = addLeague([alice, carol], {
      title: 'Other',
      leagueStartDate: et('2025-03-03T00:00'),
    });
    const oldRound = addRound(otherLeague, carol);
    const when = { submissionDate: et('2025-03-03T09:00') };
    const carols = addSubmission(oldRound, carol, {
      ...when,
      trackInfo: HEY_JUDE,
    });
    const alices = addSubmission(oldRound, alice, when);
    addVote(oldRound, alice, carols, { voteDate: et('2025-03-06T09:00') });
    addVote(oldRound, carol, alices, { voteDate: et('2025-03-06T09:00') });
    const carolsOldSong = HEY_JUDE;

    const warning = await send('POST', alice, id(open), {
      trackInfo: carolsOldSong,
    });

    expect(warning.body).toMatchObject({
      code: 'PREVIOUSLY_SUBMITTED',
      variant: 'SONG',
      trackInfo: carolsOldSong,
    });
  });
});
