import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { User } from "@/databaseTypes";
import { createSessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spotifyId } = body;

    if (!spotifyId) {
      return NextResponse.json(
        { error: "Spotify ID is required" },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection<User>("users");
    const user = await usersCollection.findOne({ spotifyId });

    if (!user) {
      return NextResponse.json({ exists: false, user: null });
    }

    // User exists, create session token and log them in
    const sessionToken = createSessionToken(user);

    const response = NextResponse.json({ exists: true, user });
    response.cookies.set("session_token", sessionToken, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Error checking Spotify user:", error);
    return NextResponse.json(
      { error: "Failed to check user" },
      { status: 500 }
    );
  }
}
