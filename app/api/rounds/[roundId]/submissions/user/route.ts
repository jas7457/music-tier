import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { SongSubmission } from "@/databaseTypes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roundId } = await params;
    const submissionsCollection = await getCollection<SongSubmission>(
      "songSubmissions"
    );

    // Find user's submission for this round
    const submission = await submissionsCollection.findOne({
      roundId,
      userId: payload.userId,
    });

    if (!submission) {
      return NextResponse.json({ submission: null });
    }

    // Convert _id to string
    const submissionResponse = {
      ...submission,
      _id: submission._id.toString(),
    };

    return NextResponse.json({ submission: submissionResponse });
  } catch (error) {
    console.error("Error fetching user submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}
