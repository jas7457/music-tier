import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { Vote } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { roundId } = await params;
    const body = await request.json();

    // Get the round and league to validate
    const votesCollection = await getCollection<Vote>("votes");

    await votesCollection.deleteMany({ userId: payload.userId, roundId });

    const now = Date.now();

    const data = Object.entries(body).map(([submissionId, entry]) => {
      const { points, note, userGuessId } = entry as {
        points: number;
        note?: string;
        userGuessId?: string;
      };
      return {
        _id: new ObjectId(),
        voteDate: now,
        submissionId,
        points,
        note,
        userGuessId,
        userId: payload.userId,
        roundId,
      };
    });

    await votesCollection.insertMany(data);

    triggerRealTimeUpdate();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving vote:", error);
    return NextResponse.json({ error: "Failed to save vote" }, { status: 500 });
  }
}
