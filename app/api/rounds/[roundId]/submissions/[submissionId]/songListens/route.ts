import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { SongListen } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";
import { unknownToErrorString } from "@/lib/utils/unknownToErrorString";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ roundId: string; submissionId: string }> }
) {
  const params = await props.params;
  return handleRequest(request, {
    roundId: params.roundId,
    submissionId: params.submissionId,
  });
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ roundId: string; submissionId: string }> }
) {
  const params = await props.params;
  return handleRequest(request, {
    roundId: params.roundId,
    submissionId: params.submissionId,
  });
}

async function handleRequest(
  request: NextRequest,
  { roundId, submissionId }: { roundId: string; submissionId: string }
) {
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    if (!roundId) {
      return NextResponse.json(
        { error: "Round ID is required" },
        { status: 400 }
      );
    }
    if (!submissionId) {
      return NextResponse.json(
        { error: "Submission ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { id, listenTime, songDuration } = body;

    const songListens = await getCollection<SongListen>("songListens");

    const currentListen = id
      ? await songListens.findOne({ _id: new ObjectId(id) })
      : null;

    if (currentListen) {
      // Update existing listen
      await songListens.updateOne(
        { _id: currentListen._id },
        {
          $set: {
            listenTime,
          },
        }
      );

      triggerRealTimeUpdate({ userIds: [payload.userId] });
      return NextResponse.json({
        success: true,
        data: { id: currentListen._id.toString() },
      });
    } else {
      // Create new listen
      const newListen: SongListen = {
        _id: new ObjectId(),
        roundId,
        submissionId,
        userId: payload.userId,
        listenDate: Date.now(),
        listenTime,
        songDuration,
      };

      await songListens.insertOne(newListen);

      triggerRealTimeUpdate({ userIds: [payload.userId] });
      return NextResponse.json({
        success: true,
        data: { id: newListen._id.toString() },
      });
    }
  } catch (error) {
    const errorString = unknownToErrorString(
      error,
      "Failed to add song listen"
    );
    console.error(errorString, error);
    return NextResponse.json({ error: errorString }, { status: 500 });
  }
}
