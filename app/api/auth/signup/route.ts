import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { League, User } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";

const INVITE_CODE = "musicleaguenowcburg2025";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, userName, spotifyId, photoUrl, inviteCode } =
      body;

    // Validate required fields
    if (!firstName || !lastName || !userName || !inviteCode) {
      return NextResponse.json(
        {
          error:
            "First name, last name, username, and invite code are required",
        },
        { status: 400 }
      );
    }

    if (inviteCode !== INVITE_CODE) {
      return NextResponse.json(
        { error: "You are not authorized to sign up" },
        { status: 403 }
      );
    }

    const [usersCollection, leagueCollection] = await Promise.all([
      getCollection<User>("users"),
      getCollection<League>("leagues"),
    ]);

    // Check if username already exists
    const existingUserByUsername = await usersCollection.findOne({ userName });
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // Check if Spotify ID already exists
    if (spotifyId) {
      const existingUserBySpotify = await usersCollection.findOne({
        spotifyId,
      });
      if (existingUserBySpotify) {
        return NextResponse.json(
          { error: "An account with this Spotify ID already exists" },
          { status: 409 }
        );
      }
    }

    // Create new user
    const userId = new ObjectId();
    const newUser: User = {
      _id: userId,
      firstName,
      lastName,
      userName,
      spotifyId,
      photoUrl,
    };

    await usersCollection.insertOne(newUser);
    // add the user to all the existing leagues
    const existingLeagues = await leagueCollection.find({}).toArray();
    for (const league of existingLeagues) {
      league.users.push(newUser._id.toString());
      await leagueCollection.updateOne(
        { _id: league._id },
        { $set: { users: league.users } }
      );
    }

    triggerRealTimeUpdate();

    // Create session token
    const sessionToken = createSessionToken(newUser);

    // Set cookie
    const response = NextResponse.json({ user: newUser });
    response.cookies.set("session_token", sessionToken, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
