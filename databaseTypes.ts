import type { ObjectId } from "mongodb";

import type { Notification } from "./lib/notifications";

type NotificationCodes = Notification["code"];

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
};

// "songSubmissions" collection */
export type SongSubmission = {
  // a mongo ObjectId
  _id: ObjectId;
  // corresponds to the round's _id
  roundId: string;
  // corresponds to the user's _id
  userId: string;
  trackInfo: {
    // a track id from spotify
    trackId: string;
    title: string;
    artists: string[];
    albumName: string;
    albumImageUrl: string;
  };
  // timestamp of when the submission was created/updated
  submissionDate: number;
  note?: string;
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
