import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { League } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";

export async function PATCH(
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
    const { heroImageUrl } = body;

    if (!heroImageUrl || typeof heroImageUrl !== "string") {
      return NextResponse.json(
        { error: "heroImageUrl is required and must be a string" },
        { status: 400 }
      );
    }

    // Get the league from the database
    const leaguesCollection = await getCollection<League>("leagues");
    const league = await leaguesCollection.findOne({
      _id: new ObjectId(leagueId),
    });

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Check if user is authorized to update the hero image
    if (league.heroImageUserId !== payload.userId) {
      return NextResponse.json(
        { error: "You are not authorized to update this league's hero image" },
        { status: 403 }
      );
    }

    // Update the hero image URL
    const result = await leaguesCollection.findOneAndUpdate(
      { _id: new ObjectId(leagueId) },
      {
        $set: {
          heroImageUrl: heroImageUrl.trim(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to update league" },
        { status: 500 }
      );
    }

    // Trigger real-time update for other users
    triggerRealTimeUpdate();

    return NextResponse.json({
      success: true,
      heroImageUrl: result.heroImageUrl,
    });
  } catch (error) {
    console.error("Error updating hero image:", error);
    return NextResponse.json(
      { error: "Failed to update hero image" },
      { status: 500 }
    );
  }
}
