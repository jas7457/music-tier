import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";
import * as path from "path";
import { League, Round } from "@/databaseTypes";

type WithRealId<T> = Omit<T, "_id"> & { _id: ObjectId };

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGO_DB_URI = process.env.MONGO_DB_URI;
const DB_NAME = "music-tier";

// User ID that already exists
const EXISTING_USER_ID = "6910bc2b15868f07eb6ab63a";

async function seed() {
  if (!MONGO_DB_URI) {
    throw new Error("MONGO_DB_URI is not defined in .env.local");
  }

  console.log("🌱 Starting database seed...");

  const client = new MongoClient(MONGO_DB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);

    // Check and seed leagues collection
    const leaguesCollection = db.collection("leagues");
    const leagueCount = await leaguesCollection.countDocuments();

    if (leagueCount === 0) {
      console.log("📝 Seeding leagues collection...");

      const leagueId = new ObjectId();
      const league: WithRealId<League> = {
        _id: leagueId,
        adminId: EXISTING_USER_ID,
        title: "Indie Rock Showdown",
        description:
          "A league dedicated to discovering the best indie rock tracks. Submit your favorite hidden gems and vote for the best tracks each round!",
        numberOfRounds: 6,
        pickingOrder: [EXISTING_USER_ID],
        daysForSubmission: 5,
        daysForVoting: 3,
      };

      await leaguesCollection.insertOne(league);
      console.log(`✅ Created league: "${league.title}" (ID: ${leagueId})`);

      // Seed rounds collection
      const roundsCollection = db.collection("rounds");
      const roundCount = await roundsCollection.countDocuments();

      if (roundCount === 0) {
        console.log("📝 Seeding rounds collection...");

        const now = Date.now();
        const submissionStartDate = now - 2 * 24 * 60 * 60 * 1000; // Started 2 days ago
        const voteStartDate = now + 1 * 24 * 60 * 60 * 1000; // Voting starts in 1 day

        const roundId = new ObjectId();
        const round: WithRealId<Round> = {
          _id: roundId,
          leagueId: leagueId.toString(),
          title: "Round 1: Best Guitar Riffs",
          description:
            "Submit and vote for tracks with the most memorable and creative guitar riffs. Let's celebrate the art of the six-string!",
          creatorId: EXISTING_USER_ID,
          submissionStartDate,
          voteStartDate,
        };

        await roundsCollection.insertOne(round);
        console.log(`✅ Created round: "${round.title}" (ID: ${roundId})`);
      } else {
        console.log("⏭️  Rounds collection already has data, skipping...");
      }
    } else {
      console.log("⏭️  Leagues collection already has data, skipping...");
    }

    console.log("\n🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run the seed function
seed();
