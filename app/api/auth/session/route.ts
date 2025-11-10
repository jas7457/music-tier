import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { League, User } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { PopulatedUser } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    const payload = verifySessionToken(sessionToken);

    if (!payload) {
      return NextResponse.json({ user: null });
    }

    // Fetch the full user from the database
    const [usersCollection, leaguesCollection] = await Promise.all([
      getCollection<User>("users"),
      getCollection<League>("leagues"),
    ]);
    const [user, league] = await Promise.all([
      usersCollection.findOne({
        _id: new ObjectId(payload.userId),
      }),
      leaguesCollection.findOne({ users: payload.userId }),
    ]);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Convert _id to string for the response
    const userResponse: PopulatedUser = {
      ...user,
      _id: user._id.toString(),
      index: league ? league.users.indexOf(payload.userId) : -1,
    };

    return NextResponse.json({ user: userResponse });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ user: null });
  }
}
