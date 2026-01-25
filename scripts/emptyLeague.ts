import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGO_DB_URI = process.env.MONGO_DB_URI;
const DB_NAME = 'music-tier';

async function emptyLeague() {
  // Get LEAGUE_ID from command line arguments
  const leagueId = process.argv[2];

  if (!leagueId) {
    throw new Error(
      'LEAGUE_ID is required. Usage: tsx scripts/emptyLeague.ts <LEAGUE_ID>',
    );
  }

  if (!MONGO_DB_URI) {
    throw new Error('MONGO_DB_URI is not defined in .env.local');
  }

  console.log(`=�  Emptying league: ${leagueId}`);

  const client = new MongoClient(MONGO_DB_URI);

  try {
    await client.connect();
    console.log(' Connected to MongoDB');

    const db = client.db(DB_NAME);

    const leaguesCollection = db.collection('leagues');
    const league = await leaguesCollection.findOne({
      _id: new ObjectId(leagueId),
    });

    if (!league) {
      console.log('League not found');
      return;
    }

    if (
      league.users.includes('692b300aba9c99901e571c16') ||
      league.users.length > 3
    ) {
      throw new Error(
        "You are clearing a real league, you don't actually want to do this.",
      );
    }

    // Get all rounds for this league
    const roundsCollection = db.collection('rounds');
    const rounds = await roundsCollection
      .find({ leagueId: leagueId })
      .toArray();

    if (rounds.length === 0) {
      console.log('�  No rounds found for this league');
      return;
    }

    const roundIds = rounds.map((round) => round._id.toString());
    console.log(`=� Found ${rounds.length} rounds to process`);

    // Delete all votes for these rounds
    const votesCollection = db.collection('votes');
    const votesResult = await votesCollection.deleteMany({
      roundId: { $in: roundIds },
    });
    console.log(` Deleted ${votesResult.deletedCount} votes`);

    // Delete all votes for these rounds
    const onDeckSongSubmissions = db.collection('onDeckSongSubmissions');
    const onDeckSongSubmissionsResult = await onDeckSongSubmissions.deleteMany({
      roundId: { $in: roundIds },
    });
    console.log(
      ` Deleted ${onDeckSongSubmissionsResult.deletedCount} on deck song submissions`,
    );

    // Delete all song submissions for these rounds
    const songSubmissionsCollection = db.collection('songSubmissions');
    const submissionsResult = await songSubmissionsCollection.deleteMany({
      roundId: { $in: roundIds },
    });
    console.log(` Deleted ${submissionsResult.deletedCount} song submissions`);

    // Delete all rounds for this league
    const roundsResult = await roundsCollection.deleteMany({
      leagueId: leagueId,
    });
    console.log(` Deleted ${roundsResult.deletedCount} rounds`);

    console.log('\n<� League emptied successfully!');
  } catch (error) {
    console.error('L Error emptying league:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('=K Disconnected from MongoDB');
  }
}

// Run the empty league function
emptyLeague();
