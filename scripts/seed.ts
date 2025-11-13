import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";
import * as path from "path";
import { League, Round, User } from "@/databaseTypes";

type WithRealId<T> = Omit<T, "_id"> & { _id: ObjectId };

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGO_DB_URI = process.env.MONGO_DB_URI;
const DB_NAME = "music-tier";

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

    const usersCollection = db.collection("users");
    const userCount = await usersCollection.countDocuments();

    if (leagueCount === 0 && userCount === 0) {
      console.log("📝 Seeding user collection...");

      const userId = new ObjectId();
      const user: WithRealId<User> = {
        _id: userId,
        firstName: "Jason",
        lastName: "Addleman",
        userName: "jas7457",
        spotifyId: "jas7457",
        signupDate: Date.now(),
      };
      await usersCollection.insertOne(user);
      console.log(`✅ Created user: ${user.userName}`);

      console.log("📝 Seeding leagues collection...");

      const leagueId = new ObjectId();
      const league: WithRealId<League> = {
        _id: leagueId,
        title: "Indie Rock Showdown",
        description:
          "A league dedicated to discovering the best indie rock tracks. Submit your favorite hidden gems and vote for the best tracks each round!",
        users: [userId.toString()],
        daysForSubmission: 5,
        daysForVoting: 3,
        votesPerRound: 7,
        leagueStartDate: Date.now(),
      };

      await leaguesCollection.insertOne(league);
      console.log(`✅ Created league: "${league.title}" (ID: ${leagueId})`);

      // Seed rounds collection
      const roundsCollection = db.collection("rounds");
      const roundCount = await roundsCollection.countDocuments();

      if (roundCount === 0) {
        console.log("📝 Seeding rounds collection...");

        const roundId = new ObjectId();
        const round: WithRealId<Round> = {
          _id: roundId,
          leagueId: leagueId.toString(),
          title: "Best Guitar Riffs",
          description:
            "Submit and vote for tracks with the most memorable and creative guitar riffs. Let's celebrate the art of the six-string!",
          creatorId: userId.toString(),
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
