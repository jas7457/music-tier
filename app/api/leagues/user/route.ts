import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getUserLeagues } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;
    const accessToken = request.cookies.get("spotify_access_token")?.value;

    if (!sessionToken || !accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifySessionToken(sessionToken);

    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userLeagues = await getUserLeagues(payload.userId);

    return NextResponse.json(userLeagues);
  } catch (error) {
    console.error("Error fetching user leagues:", error);
    return NextResponse.json(
      { error: "Failed to fetch leagues" },
      { status: 500 }
    );
  }
}
