import logo from '../../app/images/logo.png';
import logoLarge from '../../app/images/logoLarge.png';

// The real (production) Pusher app. The sandbox can point at a separate test
// app through the env overrides below (see scripts/sandbox.ts).
export const PRODUCTION_PUSHER_KEY = 'fcb8176d967e29e0121b';
export const PUSHER_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PUSHER_KEY || PRODUCTION_PUSHER_KEY;
export const PUSHER_SECRET_KEY = process.env.PUSHER_SECRET!;
export const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';
export const PUSHER_APP_ID = process.env.PUSHER_APP_ID || '2076001';

export const PUSHER_REAL_TIME_UPDATES = 'pusher_realTimeUpdates';
export const PUSHER_NOTIFICATIONS = 'pusher_notifications';

export const APP_NAME = 'Playlist Party';
export const PRODUCTION_URL = 'https://music-tier.vercel.app';

export const USER_IDS = {
  JASON: '6924608790c0b7c51ab5aec9',
  KELSEY: '692462e546422e7ee9dc0f6d',
  TJ: '6924743e2f3d26e1e94e889b',
  CODY: '6925a5f5c862b83683fbb9ea',
  DHARAM: '692722dc52eadc22aeac2cf5',
  KAYLA: '692b300aba9c99901e571c16',
  JEN: '692b4f13016f4a750237c163',
  JAMES: '692c2c9653d0e0f0ed40264e',
};

export const JASON_ID = USER_IDS.JASON;

// Users notified about polls and waited on before a poll closes early.
// Snapshotted onto each poll at creation. These are the members of the latest
// league (CASHS 4ever S9) with no test accounts. Polls are global, so this is
// intentionally a static list rather than derived from a league.
export const POLL_USER_IDS: string[] = Object.values(USER_IDS);

// Preset poll lengths offered when creating a poll.
export const POLL_DURATION_OPTIONS = [
  { label: '24 hours', hours: 24 },
  { label: '3 days', hours: 72 },
] as const;

// Effectively unlimited; just keeps a single poll document a sane size.
export const MAX_POLL_QUESTIONS = 50;
export const MAX_POLL_OPTIONS = 10;
export const MAX_POLL_TITLE_LENGTH = 200;
export const MAX_POLL_OPTION_LENGTH = 200;
export const MAX_POLL_OTHER_LENGTH = 500;

export const SIDE_PLAYLIST_ID = '4H61DjOnkWyw3b1jqcvoAP';

export const UPCOMING_ROUNDS_TO_SHOW = 0;

export const MAX_DESCRIPTION_LENGTH = 1500;

export { logo, logoLarge };
