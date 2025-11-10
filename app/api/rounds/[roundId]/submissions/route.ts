import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { SongSubmission } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { extractTrackId } from "@/lib/spotify";

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
    const { trackUrl, note } = body;

    if (!trackUrl) {
      return NextResponse.json(
        { error: "Track URL is required" },
        { status: 400 }
      );
    }

    // Extract track ID from URL
    const trackId = extractTrackId(trackUrl);

    if (!trackId) {
      return NextResponse.json(
        { error: "Invalid Spotify track URL" },
        { status: 400 }
      );
    }

    const submissionsCollection = await getCollection<SongSubmission>(
      "songSubmissions"
    );

    // Check if user has already submitted for this round
    const existingSubmission = await submissionsCollection.findOne({
      roundId,
      userId: payload.userId,
    });

    if (existingSubmission) {
      return NextResponse.json(
        {
          error:
            "You have already submitted a song for this round. Use PUT to update it.",
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
      trackId,
      note,
      submissionDate: Date.now(),
    };

    await submissionsCollection.insertOne(newSubmission);

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
    const { trackUrl, note } = body;

    if (!trackUrl) {
      return NextResponse.json(
        { error: "Track URL is required" },
        { status: 400 }
      );
    }

    // Extract track ID from URL
    const trackId = extractTrackId(trackUrl);

    if (!trackId) {
      return NextResponse.json(
        { error: "Invalid Spotify track URL" },
        { status: 400 }
      );
    }

    const submissionsCollection = await getCollection<SongSubmission>(
      "songSubmissions"
    );

    // Update existing submission
    const result = await submissionsCollection.findOneAndUpdate(
      {
        roundId,
        userId: payload.userId,
      },
      {
        $set: {
          trackId,
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

    return NextResponse.json({ submission: updatedSubmission });
  } catch (error) {
    console.error("Error updating song submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}
