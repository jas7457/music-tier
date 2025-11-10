/* "users" collection */
export type User = {
  // a mongo ObjectId
  _id: string;
  spotifyId?: string;
  firstName: string;
  lastName: string;
  userName: string;
  photoUrl?: string;
};

/* "leagues" collection */
export type League = {
  // a mongo ObjectId
  _id: string;
  title: string;
  description: string;
  numberOfRounds: number;
  votesPerRound: number;
  // array of user IDs
  users: string[];

  // timestamp of when the league starts
  leagueStartDate: number;
  // how many days after submissions start that people can submit their songs
  daysForSubmission: number;
  // how many days after voting starts for votes to come in
  daysForVoting: number;
};

/* "rounds" collection */
export type Round = {
  // a mongo ObjectId
  _id: string;
  // maps to a league's _id - which is essentially just a collection of rounds
  leagueId: string;
  title: string;
  description: string;
  creatorId: string;
};

// "songSubmissions" collection */
export type SongSubmission = {
  // a mongo ObjectId
  _id: string;
  // corresponds to the round's _id
  roundId: string;
  // corresponds to the user's _id
  userId: string;
  // a track id from spotify
  trackId: string;
  // timestamp of when the submission was created/updated
  submissionDate: number;
  note?: string;
};

/* "votes" collection */
export type Vote = {
  // a mongo ObjectId
  _id: string;
  // corresponds to the user's _id
  userId: string;
  // corresponds to the RoundSubmission's _id
  submissionId: string;
  roundId: string;
  points: number;
  note?: string;
};
