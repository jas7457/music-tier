/**
 * Fake data for the local sandbox (see scripts/sandbox.ts). Only ever called
 * with a connection to the in-memory MongoDB on 127.0.0.1.
 *
 * Timeline (all relative to the moment of seeding, league with 8 members):
 *   round 0  kickoff (jason)    completed
 *   round 1-4  users 0..3       completed
 *   round 5  user 4             CURRENT  (voting or submission, see `stage`)
 *   round 6  user 5             upcoming, created (title + description)
 *   round 7-8  users 6, 7       upcoming, pending (nobody picked a theme yet)
 *   round 9  bonus (user 1)     upcoming, pending
 */
import { ObjectId, type Db } from 'mongodb';
import type {
  League,
  OnDeckSongSubmission,
  Poll,
  Round,
  SongSubmission,
  TrackInfo,
  User,
  Vote,
} from '../databaseTypes';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../lib/utils/notificationSettings';
import { getStartOfDay } from '../lib/utils/roundSchedule';
import tracksJson from './data/sandboxTracks.json';

export type SandboxStage = 'voting' | 'submission';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const TRACKS = tracksJson as TrackInfo[];

const COLLECTIONS = [
  'users',
  'leagues',
  'rounds',
  'songSubmissions',
  'onDeckSongSubmissions',
  'votes',
  'polls',
  'scheduledNotifications',
  'sandboxMeta',
];

// Fixed ids so URLs stay stable across reseeds.
const oid = (n: number) => new ObjectId(n.toString(16).padStart(24, '0'));
export const SANDBOX_IDS = {
  league: oid(0x5b01).toHexString(),
  oldLeague: oid(0x5b02).toHexString(),
};

// Small deterministic PRNG so reseeds look the same.
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = makeRng(42);
const chance = (p: number) => rand() < p;
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let trackCursor = 0;
const nextTrack = (): TrackInfo => TRACKS[trackCursor++ % TRACKS.length];

const FRIENDS = [
  ['Maya', 'Chen', 'mayac'],
  ['Theo', 'Ramirez', 'theo_r'],
  ['Priya', 'Patel', 'priyap'],
  ['Sam', 'Okafor', 'samokafor'],
  ['Lena', 'Fischer', 'lenaf'],
  ['Diego', 'Alvarez', 'diegoa'],
  ['Ruby', 'Walsh', 'rubyw'],
];

const SUBMISSION_NOTES = [
  'Had to. No notes.',
  'This one got me through college.',
  'Turn it up loud 🔊',
  'Heard this at a wedding and it never left my head.',
  'Deep cut, I promise it grows on you.',
  'The bridge at 2:10 is unreal.',
  'Dad played this on every road trip.',
  'Sorry in advance 😅',
];
const VOTE_NOTES = [
  'Great pick!',
  'Instant classic.',
  'Okay I need to add this to my playlists.',
  'Did not expect this one, love it.',
  'Too good.',
  'Cute but not my favorite.',
  'This was the vibe.',
];

const ROUNDS = [
  {
    title: '🚗 Road Trip Kickoff',
    description:
      'Welcome to the league! Submit the song you would blast with the windows down on the first day of a long drive.',
  },
  {
    title: '🎸 Guilty Pleasures',
    description:
      'A song you love but would never admit to at a party. No judgement here. (Some judgement.)',
  },
  {
    title: '📼 Songs From Before You Were 10',
    description:
      'Take us back to the music of your childhood. Whatever was on the radio, the tape deck, or the family minivan.',
  },
  {
    title: '🌧️ Rainy Day Feels',
    description:
      'Moody, mellow, perfect for staring out of a window. Bonus points if it works for crying in the shower.',
  },
  {
    title: '🕺 Main Character Energy',
    description:
      'The song that plays in the montage when you walk in slow motion. Confidence in audio form.',
  },
  {
    title: '🎬 Movie Credits Songs',
    description:
      'A song that plays over the end credits of a movie (or that ought to). Tell us the movie in the note!',
  },
  { title: '', description: '' },
  { title: '', description: '' },
];

function toTrack(t: TrackInfo): TrackInfo {
  return { ...t };
}

type Ctx = {
  users: User[];
  rounds: Round[];
  submissions: SongSubmission[];
  votes: Vote[];
};

function makeVotes({
  ctx,
  round,
  voterIds,
  votesPerRound,
  firstVoteDate,
  lastVoteDate,
}: {
  ctx: Ctx;
  round: Round;
  voterIds: string[];
  votesPerRound: number;
  firstVoteDate: number;
  lastVoteDate: number;
}) {
  const roundId = round._id.toString();
  const subs = ctx.submissions.filter((s) => s.roundId === roundId);
  const allUserIds = ctx.users.map((u) => u._id.toString());
  voterIds.forEach((voterId, i) => {
    const candidates = shuffle(subs.filter((s) => s.userId !== voterId));
    const count = Math.min(candidates.length, 3 + Math.floor(rand() * 3));
    const chosen = candidates.slice(0, count);
    // Every chosen song gets 1 point, the rest is handed out at random.
    const points = chosen.map(() => 1);
    for (let p = votesPerRound - count; p > 0; p--) {
      points[Math.floor(rand() * 2 + rand())]++; // favour the first picks
    }
    const span = Math.max(lastVoteDate - firstVoteDate, 1);
    // The final voter lands exactly on lastVoteDate (that ends the round).
    const voteDate =
      i === voterIds.length - 1
        ? lastVoteDate
        : firstVoteDate + Math.floor((span * i) / voterIds.length);
    chosen.forEach((sub, idx) => {
      const vote: Vote = {
        _id: new ObjectId(),
        userId: voterId,
        submissionId: sub._id.toString(),
        roundId,
        points: points[idx],
        voteDate,
      };
      if (chance(0.4)) {
        vote.note = pick(VOTE_NOTES);
      }
      if (chance(0.6)) {
        vote.userGuessId = chance(0.4)
          ? sub.userId
          : pick(
              allUserIds.filter((id) => id !== voterId && id !== sub.userId),
            );
      }
      ctx.votes.push(vote);
    });
  });
}

function makeSubmissions({
  ctx,
  round,
  userIds,
  from,
  to,
}: {
  ctx: Ctx;
  round: Round;
  userIds: string[];
  from: number;
  to: number;
}) {
  userIds.forEach((userId, i) => {
    const date =
      userIds.length === 1
        ? to
        : Math.floor(from + ((to - from) * i) / (userIds.length - 1));
    const submission: SongSubmission = {
      _id: new ObjectId(),
      roundId: round._id.toString(),
      userId,
      trackInfo: toTrack(nextTrack()),
      submissionDate: date,
    };
    if (chance(0.45)) {
      submission.note = pick(SUBMISSION_NOTES);
    }
    ctx.submissions.push(submission);
  });
}

function makeRound(
  ctx: Ctx,
  leagueId: string,
  creatorId: string,
  index: number,
  flags: { isKickoffRound?: boolean; isBonusRound?: boolean } = {},
  created = true,
): Round {
  const theme = ROUNDS[index % ROUNDS.length];
  const round: Round = {
    _id: oid(0x5d01 + ctx.rounds.length),
    leagueId,
    title: created ? theme.title : '',
    description: created ? theme.description : '',
    creatorId,
    isBonusRound: flags.isBonusRound ?? false,
    isKickoffRound: flags.isKickoffRound ?? false,
    submissionDate: Date.now(),
    lastUpdatedDate: Date.now(),
  };
  ctx.rounds.push(round);
  return round;
}

export async function seedSandbox(db: Db, { stage }: { stage: SandboxStage }) {
  const now = Date.now();
  const ctx: Ctx = { users: [], rounds: [], submissions: [], votes: [] };

  /* ---- users ---- */
  const names = [['Jason', 'Dev', 'jason'], ...FRIENDS];
  const notificationSettings = {
    ...Object.fromEntries(
      Object.keys(DEFAULT_NOTIFICATION_SETTINGS).map((key) => [key, false]),
    ),
  } as NonNullable<User['notificationSettings']>;
  ctx.users = names.map(([firstName, lastName, userName], i) => ({
    _id: oid(0x5a01 + i),
    spotifyId: `sandbox-${userName}`,
    firstName,
    lastName,
    userName,
    signupDate: now - (200 - i * 5) * DAY,
    photoUrl: `https://i.pravatar.cc/150?img=${[12, 47, 33, 5, 68, 25, 9, 44][i]}`,
    notificationSettings: { ...notificationSettings },
  }));
  const ids = ctx.users.map((u) => u._id.toString());
  const [jason, ...friends] = ids;

  /* ---- main league ---- */
  // Start of the current round, and how it sits relative to now.
  const currentStart = stage === 'voting' ? now - 3 * DAY : now - 1.5 * DAY;
  const leagueStart = getStartOfDay(currentStart - 5 * 3.5 * DAY);
  const slotLength = (currentStart - leagueStart) / 5;
  const slotStart = (k: number) => Math.round(leagueStart + k * slotLength);

  const league: League = {
    _id: new ObjectId(SANDBOX_IDS.league),
    title: 'Sandbox Showdown',
    description:
      'Fake league for local development. 8 friends, 10 rounds, zero real emails.',
    votesPerRound: 7,
    users: ids,
    leagueStartDate: leagueStart,
    daysForSubmission: 4,
    daysForVoting: 3,
    kickoffRoundUserIds: [jason],
    bonusRoundUserIds: [friends[0]],
    upcomingRoundsToShow: 2,
  };

  // Completed rounds: kickoff (jason) + users 0..3, everyone submitted & voted.
  const completed: Array<{
    creator: string;
    flags: { isKickoffRound?: boolean };
  }> = [
    { creator: jason, flags: { isKickoffRound: true } },
    { creator: ids[0], flags: {} },
    { creator: ids[1], flags: {} },
    { creator: ids[2], flags: {} },
    { creator: ids[3], flags: {} },
  ];
  completed.forEach(({ creator, flags }, k) => {
    const round = makeRound(ctx, league._id.toString(), creator, k, flags);
    const start = slotStart(k);
    const end = slotStart(k + 1); // last vote == next round's start
    makeSubmissions({
      ctx,
      round,
      userIds: shuffle(ids),
      from: start + 3 * HOUR,
      to: start + 1.4 * DAY,
    });
    makeVotes({
      ctx,
      round,
      voterIds: shuffle(ids),
      votesPerRound: league.votesPerRound,
      firstVoteDate: start + 1.5 * DAY,
      lastVoteDate: end,
    });
  });

  // Current round (created by user 4).
  const current = makeRound(ctx, league._id.toString(), ids[4], 5);
  if (stage === 'voting') {
    const lastSubmission = now - 20 * HOUR;
    makeSubmissions({
      ctx,
      round: current,
      userIds: shuffle(ids),
      from: currentStart + 3 * HOUR,
      to: lastSubmission,
    });
    // jason has NOT voted; 4 friends have.
    makeVotes({
      ctx,
      round: current,
      voterIds: [friends[0], friends[1], friends[2], friends[4]],
      votesPerRound: league.votesPerRound,
      firstVoteDate: lastSubmission + HOUR,
      lastVoteDate: now - HOUR,
    });
  } else {
    // jason has NOT submitted; 5 friends have.
    makeSubmissions({
      ctx,
      round: current,
      userIds: shuffle(friends).slice(0, 5),
      from: currentStart + 3 * HOUR,
      to: now - HOUR,
    });
  }

  // Upcoming: one created (user 5), the rest pending (no round document).
  makeRound(ctx, league._id.toString(), ids[5], 6);

  // A couple of on-deck songs jason saved for later.
  const onDeck: OnDeckSongSubmission[] = [0, 1].map(() => ({
    _id: new ObjectId(),
    roundId: current._id.toString(),
    userId: jason,
    trackInfo: toTrack(nextTrack()),
    isAddedToSidePlaylist: false,
  }));

  /* ---- older, completed league (4 players, 4 rounds) ---- */
  const oldIds = ids.slice(0, 4);
  const oldStart = getStartOfDay(now - 100 * DAY);
  const oldLeague: League = {
    _id: new ObjectId(SANDBOX_IDS.oldLeague),
    title: 'Season 1: Throwback Thursday',
    description: 'The original four. Long since finished.',
    votesPerRound: 5,
    users: oldIds,
    leagueStartDate: oldStart,
    daysForSubmission: 3,
    daysForVoting: 2,
    kickoffRoundUserIds: [],
    bonusRoundUserIds: [],
  };
  oldIds.forEach((creator, k) => {
    const round = makeRound(ctx, oldLeague._id.toString(), creator, k + 1);
    const start = oldStart + k * 5 * DAY;
    makeSubmissions({
      ctx,
      round,
      userIds: shuffle(oldIds),
      from: start + 2 * HOUR,
      to: start + DAY,
    });
    makeVotes({
      ctx,
      round,
      voterIds: shuffle(oldIds),
      votesPerRound: oldLeague.votesPerRound,
      firstVoteDate: start + 1.2 * DAY,
      lastVoteDate: start + 3 * DAY,
    });
  });

  /* ---- polls ---- */
  const opt = (id: string, text: string) => ({ id, text });
  const openPoll: Poll = {
    _id: oid(0x5c01),
    title: 'Which decade should the next bonus round celebrate?',
    description: 'Pick one. Votes are anonymous.',
    creatorId: friends[1],
    isCreatorAnonymous: false,
    questions: [
      {
        id: 'q1',
        text: '',
        options: [
          opt('a', '1970s'),
          opt('b', '1980s'),
          opt('c', '1990s'),
          opt('d', '2000s'),
        ],
        allowMultiple: false,
        allowOther: true,
      },
    ],
    createdDate: now - 3 * HOUR,
    startDate: now - 3 * HOUR,
    endDate: now + 2 * DAY,
    eligibleUserIds: ids,
    votes: [friends[0], friends[2], friends[3]].map((userId, i) => ({
      userId,
      answers: [{ questionId: 'q1', optionIds: [['b', 'c', 'b'][i]] }],
      voteDate: now - (2 - i) * HOUR,
    })),
  };
  const closedPoll: Poll = {
    _id: oid(0x5c02),
    title: 'Snack and playlist preferences',
    creatorId: jason,
    isCreatorAnonymous: false,
    questions: [
      {
        id: 'q1',
        text: 'Best listening-party snack?',
        options: [opt('a', 'Pizza'), opt('b', 'Tacos'), opt('c', 'Popcorn')],
        allowMultiple: true,
        allowOther: true,
      },
      {
        id: 'q2',
        text: 'Ideal playlist length?',
        options: [opt('a', '20 songs'), opt('b', '40 songs')],
        allowMultiple: false,
        allowOther: false,
      },
    ],
    createdDate: now - 6 * DAY,
    startDate: now - 6 * DAY,
    endDate: now - 3 * DAY,
    closedDate: now - 4 * DAY,
    eligibleUserIds: ids,
    votes: ids.map((userId, i) => ({
      userId,
      answers: [
        {
          questionId: 'q1',
          optionIds: i === 7 ? [] : [['a', 'b', 'c'][i % 3]],
          ...(i === 7 ? { otherText: 'Nachos' } : {}),
        },
        { questionId: 'q2', optionIds: [i % 3 === 0 ? 'a' : 'b'] },
      ],
      voteDate: now - 5 * DAY + i * HOUR,
    })),
    startNotificationSentDate: now - 6 * DAY,
    resultsNotificationSentDate: now - 4 * DAY,
  };

  /* ---- write ---- */
  await Promise.all(
    COLLECTIONS.map((name) => db.collection(name).deleteMany({})),
  );
  await db.collection<User>('users').insertMany(ctx.users);
  await db.collection<League>('leagues').insertMany([league, oldLeague]);
  await db.collection<Round>('rounds').insertMany(ctx.rounds);
  await db
    .collection<SongSubmission>('songSubmissions')
    .insertMany(ctx.submissions);
  await db.collection<Vote>('votes').insertMany(ctx.votes);
  await db
    .collection<OnDeckSongSubmission>('onDeckSongSubmissions')
    .insertMany(onDeck);
  await db.collection<Poll>('polls').insertMany([openPoll, closedPoll]);
  await db.collection('sandboxMeta').insertOne({ stage, seededAt: now });

  return {
    leagueId: SANDBOX_IDS.league,
    oldLeagueId: SANDBOX_IDS.oldLeague,
    currentRoundId: current._id.toString(),
    rounds: ctx.rounds.map((r) => r._id.toString()),
  };
}
