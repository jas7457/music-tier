import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { SongSubmission } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";

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
    const { trackInfo, note } = body;

    if (!trackInfo) {
      return NextResponse.json(
        { error: "Track URL is required" },
        { status: 400 }
      );
    }

    const submissionsCollection = await getCollection<SongSubmission>(
      "songSubmissions"
    );

    // Check if user has already submitted for this round
    const [existingSubmission, existingSong] = await Promise.all([
      submissionsCollection.findOne({
        roundId,
        userId: payload.userId,
      }),
      submissionsCollection.findOne({
        roundId,
        "trackInfo.trackId": trackInfo.trackId,
      }),
    ]);

    if (existingSubmission) {
      return NextResponse.json(
        {
          error:
            "You have already submitted a song for this round. Use PUT to update it.",
        },
        { status: 409 }
      );
    }

    if (existingSong) {
      return NextResponse.json(
        {
          error:
            "You have great taste! This song has already been submitted by another user in this round.",
        },
        { status: 409 }
      );
    }

    // Create new submission
    const submissionId = new ObjectId();
    const newSubmission: SongSubmission = {
      _id: submissionId,
      roundId,
      userId: payload.userId,
      trackInfo,
      note,
      submissionDate: Date.now(),
    };

    await submissionsCollection.insertOne(newSubmission);
    triggerRealTimeUpdate();

    return NextResponse.json({ submission: newSubmission });
  } catch (error) {
    console.error("Error submitting song:", error);
    return NextResponse.json(
      { error: "Failed to submit song" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { trackInfo, note } = body;

    if (!trackInfo) {
      return NextResponse.json(
        { error: "Track URL is required" },
        { status: 400 }
      );
    }

    // Extract track ID from URL
    const trackId = trackInfo.trackId;

    if (!trackId) {
      return NextResponse.json(
        { error: "Invalid Spotify track URL" },
        { status: 400 }
      );
    }

    const submissionsCollection = await getCollection<SongSubmission>(
      "songSubmissions"
    );

    const existingSong = await submissionsCollection.findOne({
      roundId,
      "trackInfo.trackId": trackInfo.trackId,
    });

    if (existingSong && existingSong.userId !== payload.userId) {
      return NextResponse.json(
        {
          error:
            "You have great taste! This song has already been submitted by another user in this round.",
        },
        { status: 409 }
      );
    }

    // Update existing submission
    const result = await submissionsCollection.findOneAndUpdate(
      {
        roundId,
        userId: payload.userId,
      },
      {
        $set: {
          trackInfo,
          note,
          submissionDate: Date.now(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "No submission found to update" },
        { status: 404 }
      );
    }

    const updatedSubmission = {
      ...result,
      _id: result._id.toString(),
    };

    triggerRealTimeUpdate();

    return NextResponse.json({ submission: updatedSubmission });
  } catch (error) {
    console.error("Error updating song submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}
