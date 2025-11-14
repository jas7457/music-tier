import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { League, Round } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";

export async function POST(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  try {
    const payload = verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { leagueId } = params;
    const body = await request.json();
    const { title, description, isBonusRound: _isBonusRound } = body;
    const isBonusRound = Boolean(_isBonusRound);

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const [leaguesCollection, roundsCollection] = await Promise.all([
      getCollection<League>("leagues"),
      getCollection<Round>("rounds"),
    ]);

    // Verify league exists
    const league = await leaguesCollection.findOne({
      _id: new ObjectId(leagueId),
    });

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Verify user is in the league
    if (!league.users.includes(payload.userId)) {
      return NextResponse.json(
        { error: "You are not a member of this league" },
        { status: 403 }
      );
    }

    // Check if user has already created a round for this league
    const existingRound = await roundsCollection.findOne({
      leagueId: leagueId,
      creatorId: payload.userId,
    });

    if (existingRound) {
      if (isBonusRound) {
        const existingBonusRound = await roundsCollection.findOne({
          leagueId: leagueId,
          creatorId: payload.userId,
          isBonusRound: true,
        });
        if (existingBonusRound) {
          return NextResponse.json(
            { error: "You have already created a bonus round for this league" },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "You have already created a round for this league" },
          { status: 400 }
        );
      }
    }

    // Create the round
    const newRound: Round = {
      _id: new ObjectId(),
      leagueId: leagueId,
      title: title.trim(),
      description: description.trim(),
      creatorId: payload.userId,
      isBonusRound: Boolean(isBonusRound),
    };

    const result = await roundsCollection.insertOne(newRound);
    triggerRealTimeUpdate();

    return NextResponse.json({
      success: true,
      round: {
        ...newRound,
        _id: result.insertedId.toString(),
      },
    });
  } catch (error) {
    console.error("Error creating round:", error);
    return NextResponse.json(
      { error: "Failed to create round" },
      { status: 500 }
    );
  }
}
