import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { League } from "@/databaseTypes";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifySessionToken(sessionToken);

    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const leaguesCollection = await getCollection<League>("leagues");

    // Find leagues where user is admin or in pickingOrder
    const leagues = await leaguesCollection
      .find({
        $or: [{ adminId: payload.userId }, { pickingOrder: payload.userId }],
      })
      .toArray();

    return NextResponse.json({ leagues });
  } catch (error) {
    console.error("Error fetching user leagues:", error);
    return NextResponse.json(
      { error: "Failed to fetch leagues" },
      { status: 500 }
    );
  }
}
