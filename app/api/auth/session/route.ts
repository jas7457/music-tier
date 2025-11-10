import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { User } from "@/databaseTypes";
import { ObjectId } from "mongodb";

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
    const usersCollection = await getCollection<User>("users");
    const user = await usersCollection.findOne({
      _id: new ObjectId(payload.userId),
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Convert _id to string for the response
    const userResponse = {
      ...user,
      _id: user._id.toString(),
    };

    return NextResponse.json({ user: userResponse });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ user: null });
  }
}
