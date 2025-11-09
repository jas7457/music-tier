import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { Round, League } from "@/databaseTypes";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifySessionToken(sessionToken);

    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { leagueId } = params;

    // Fetch the league to get daysForVoting
    const leaguesCollection = await getCollection<League>("leagues");
    const league = await leaguesCollection.findOne({ _id: new ObjectId(leagueId) } as any);

    if (!league) {
      return NextResponse.json(
        { error: "League not found" },
        { status: 404 }
      );
    }

    const roundsCollection = await getCollection<Round>("rounds");

    // Find all rounds for this league
    const rounds = await roundsCollection.find({ leagueId }).toArray();

    // Categorize rounds by status
    const now = Date.now();
    const categorizedRounds = {
      current: rounds.find((round) => {
        const started = !round.submissionStartDate || round.submissionStartDate <= now;
        // Calculate round end date: voteStartDate + daysForVoting
        const roundEndDate = round.voteStartDate
          ? round.voteStartDate + (league.daysForVoting * 24 * 60 * 60 * 1000)
          : null;
        const notEnded = !roundEndDate || roundEndDate > now;
        return started && notEnded;
      }),
      completed: rounds.filter((round) => {
        // Calculate round end date: voteStartDate + daysForVoting
        const roundEndDate = round.voteStartDate
          ? round.voteStartDate + (league.daysForVoting * 24 * 60 * 60 * 1000)
          : null;
        return roundEndDate && roundEndDate <= now;
      }),
      upcoming: rounds.filter((round) => {
        return round.submissionStartDate && round.submissionStartDate > now;
      }),
    };

    return NextResponse.json({ rounds: categorizedRounds });
  } catch (error) {
    console.error("Error fetching league rounds:", error);
    return NextResponse.json(
      { error: "Failed to fetch rounds" },
      { status: 500 }
    );
  }
}
