import type { ObjectId } from 'mongodb';

import type { Notification } from './lib/notifications';

type NotificationCodes = Notification['code'];

export type TrackInfo = {
  // a track id from spotify
  trackId: string;
  title: string;
  artists: string[];
  albumName: string;
  albumImageUrl: string;
};

/* "users" collection */
export type User = {
  // a mongo ObjectId
  _id: ObjectId;
  spotifyId?: string;
  firstName: string;
  lastName: string;
  userName: string;
  signupDate: number;
  photoUrl?: string;
  phoneNumber?: string;
  phoneCarrier?: 'verizon' | 'att' | 'tmobile';
  phoneVerificationCode?: string;
  phoneVerified?: boolean;
  emailAddress?: string;
  notificationSettings?: Record<NotificationCodes, boolean> & {
    textNotificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
  };
  pushSubscriptions?: PushSubscription[];
};

/* Push subscription for web push notifications */
export type PushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

/* "leagues" collection */
export type League = {
  // a mongo ObjectId
  _id: ObjectId;
  title: string;
  description: string;
  votesPerRound: number;
  // array of user IDs
  users: string[];

  // timestamp of when the league starts
  leagueStartDate: number;
  // how many days after submissions start that people can submit their songs
  daysForSubmission: number;
  // how many days after voting starts for votes to come in
  daysForVoting: number;
  // array of user IDs who are allowed to create a kickoff round
  kickoffRoundUserIds: string[];
  // array of user IDs who are allowed to create a bonus round
  bonusRoundUserIds: string[];

  // Whether phases auto-advance the moment everyone finishes early. When true
  // (the default when this field is absent), voting opens as soon as everyone
  // submits and the next round opens as soon as everyone votes. When false,
  // every phase runs its full scheduled window regardless of early finishers.
  autoStartRounds?: boolean;
  // Hour of day (0-23, America/New_York) that round day-boundaries fall on.
  // Defaults to 0 (midnight) when absent, which preserves the original
  // behavior. Set to e.g. 9 to have submissions/voting flip over at 9am ET.
  transitionHour?: number;

  heroImageUserId?: string;
  heroImageUrl?: string;
  // Focal point as percentages (0-100) used for background-position when
  // rendering the hero image with background-size: cover.
  heroImageFocalX?: number;
  heroImageFocalY?: number;
};

/* "rounds" collection */
export type Round = {
  // a mongo ObjectId
  _id: ObjectId;
  // maps to a league's _id - which is essentially just a collection of rounds
  leagueId: string;
  title: string;
  description: string;
  creatorId: string;
  // whether there is a spotify playlist for this round
  spotifyPlaylistId?: string;
  // whether this round is a bonus round
  isBonusRound: boolean;
  // whether this round is a kickoff round
  isKickoffRound: boolean;
  submissionDate: number;
  lastUpdatedDate: number;

  // optionally allow for custom submission and voting dates
  submissionStartDate?: number;
  submissionEndDate?: number;
  votingStartDate?: number;
  votingEndDate?: number;
};

// "songSubmissions" collection */
export type SongSubmission = {
  // a mongo ObjectId
  _id: ObjectId;
  // corresponds to the round's _id
  roundId: string;
  // corresponds to the user's _id
  userId: string;
  trackInfo: TrackInfo;
  // timestamp of when the submission was created/updated
  submissionDate: number;
  note?: string;
  youtubeURL?: string;
};

// "onDeckSongSubmissions" collection */
export type OnDeckSongSubmission = {
  // a mongo ObjectId
  _id: ObjectId;
  // corresponds to the round's _id
  roundId: string;
  // corresponds to the user's _id
  userId: string;
  trackInfo: TrackInfo;
  isAddedToSidePlaylist: boolean;
};

/* "votes" collection */
export type Vote = {
  // a mongo ObjectId
  _id: ObjectId;
  // corresponds to the user's _id
  userId: string;
  // corresponds to the RoundSubmission's _id
  submissionId: string;
  roundId: string;
  points: number;
  voteDate: number;
  note?: string;
  // corresponds to a guess for who submitted the song
  userGuessId?: string;
};

/* "scheduledNotifications" collection */
export type ScheduledNotification = {
  _id: ObjectId;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  leagueId: string;
  userIds: string[];

  executeAt: number;
  executedAt?: number;
  error?: string;
} & (
  | {
      type: 'VOTING.REMINDER';
      data: {
        roundId: string;
        notification: {
          code: 'VOTING.REMINDER';
          title: string;
          message: string;
        };
      };
    }
  | {
      type: 'SUBMISSION.REMINDER';
      data: {
        roundId: string;
        notification: {
          code: 'SUBMISSION.REMINDER';
          title: string;
          message: string;
        };
      };
    }
  // Phase-transition notifications. Only scheduled for leagues with
  // autoStartRounds === false, where the early-finish path that would
  // otherwise send these in real time is suppressed.
  | {
      type: 'VOTING.STARTED';
      data: {
        roundId: string;
        notification: {
          code: 'VOTING.STARTED';
          title: string;
          message: string;
        };
      };
    }
  | {
      type: 'ROUND.COMPLETED';
      data: {
        roundId: string;
        notification: {
          code: 'ROUND.COMPLETED';
          title: string;
          message: string;
        };
      };
    }
  | {
      type: 'LEAGUE.COMPLETED';
      data: {
        roundId: string;
        notification: {
          code: 'LEAGUE.COMPLETED';
          title: string;
          message: string;
        };
      };
    }
);
