import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getUserLeagues } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("spotify_access_token")?.value;
    const payload = verifySessionToken();
    if (!payload || !accessToken) {
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
