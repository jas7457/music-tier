import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { Vote } from "@/databaseTypes";
import { ObjectId } from "mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: { roundId: string } }
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

    const { roundId } = params;
    const body = await request.json();

    // Get the round and league to validate
    const votesCollection = await getCollection<Vote>("votes");

    await votesCollection.deleteMany({ userId: payload.userId, roundId });

    const data = Object.entries(body).map(([submissionId, entry]) => {
      const { points, note } = entry as { points: number; note?: string };
      return {
        _id: new ObjectId().toString(),
        submissionId,
        points,
        note,
        userId: payload.userId,
        roundId,
      };
    });

    await votesCollection.insertMany(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving vote:", error);
    return NextResponse.json({ error: "Failed to save vote" }, { status: 500 });
  }
}
