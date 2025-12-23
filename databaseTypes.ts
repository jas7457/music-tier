import type { ObjectId } from "mongodb";

import type { Notification } from "./lib/notifications";

type NotificationCodes = Notification["code"];

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
  phoneCarrier?: "verizon" | "att" | "tmobile";
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
  // array of user IDs who are allowed to create a bonus round
  bonusRoundUserIds: string[];

  heroImageUserId?: string;
  heroImageUrl?: string;
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

/* "songListens" collection */
export type SongListen = {
  // a mongo ObjectId
  _id: ObjectId;
  // corresponds to the user's _id
  userId: string;
  // corresponds to the RoundSubmission's _id
  submissionId: string;
  roundId: string;
  listenDate: number;
  listenTime: number;
  songDuration: number;
};

/* "scheduledNotifications" collection */
export type ScheduledNotification = {
  _id: ObjectId;
  status: "pending" | "completed" | "failed" | "cancelled";
  leagueId: string;
  userIds: string[];

  executeAt: number;
  executedAt?: number;
  error?: string;
} & (
  | {
      type: "VOTING.REMINDER";
      data: {
        roundId: string;
        notification: {
          code: "VOTING.REMINDER";
          title: string;
          message: string;
        };
      };
    }
  | {
      type: "SUBMISSION.REMINDER";
      data: {
        roundId: string;
        notification: {
          code: "SUBMISSION.REMINDER";
          title: string;
          message: string;
        };
      };
    }
);
