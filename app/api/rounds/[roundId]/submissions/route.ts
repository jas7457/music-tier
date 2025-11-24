import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { SongSubmission } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";
import { getUserLeagues } from "@/lib/data";
import { getAllRounds } from "@/lib/utils/getAllRounds";
import { submissionNotifications } from "@/lib/notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  return handleRequest(request, { roundId: params.roundId, method: "ADD" });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  return handleRequest(request, { roundId: params.roundId, method: "UPDATE" });
}

async function handleRequest(
  request: NextRequest,
  { roundId, method }: { roundId: string; method: "ADD" | "UPDATE" }
) {
  try {
    const payload = verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    if (!roundId) {
      return NextResponse.json(
        { error: "Round ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { trackInfo, note } = body;

    if (!trackInfo || !trackInfo.trackId) {
      return NextResponse.json(
        { error: "Track URL is required" },
        { status: 400 }
      );
    }

    const userLeagues = await getUserLeagues(payload.userId);

    const { round: foundRound, league: foundLeague } = (() => {
      for (const league of userLeagues) {
        const rounds = getAllRounds(league, {
          includePending: false,
          includeFake: false,
        });

        for (const round of rounds) {
          if (round._id.toString() === roundId) {
            return { round, league };
          }
        }
      }
      return { round: null, league: null };
    })();

    if (!foundRound) {
      return NextResponse.json(
        { error: "No roound was found, Charlie Brown" },
        { status: 404 }
      );
    }

    if (foundRound.stage !== "submission") {
      return NextResponse.json(
        {
          error: `Submissions are not open for this round. The round is currently in the "${foundRound.stage}" stage.`,
        },
        { status: 403 }
      );
    }

    const existingSubmission = foundRound.submissions.find(
      (sub) => sub.userId === payload.userId
    );

    if (existingSubmission && method === "ADD") {
      return NextResponse.json(
        {
          error:
            "You have already submitted a song for this round. Use PUT to update it.",
        },
        { status: 409 }
      );
    }

    const existingSong = foundRound.submissions.find(
      (sub) => sub.trackInfo.trackId === trackInfo.trackId
    );

    if (
      existingSong &&
      (method === "ADD" ? true : existingSong.userId !== payload.userId)
    ) {
      return NextResponse.json(
        {
          error:
            "You have great taste! This song has already been submitted by another user in this round.",
        },
        { status: 409 }
      );
    }

    const submissionsCollection = await getCollection<SongSubmission>(
      "songSubmissions"
    );

    const newSubmission = await (async () => {
      if (method === "ADD") {
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
        return newSubmission;
      } else {
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
          throw new Error("No submission found to update");
        }

        const updatedSubmission = {
          ...result,
          _id: result._id.toString(),
        };
        return updatedSubmission;
      }
    })();

    triggerRealTimeUpdate();

    if (method === "ADD") {
      submissionNotifications({
        league: foundLeague,
        submission: newSubmission,
        before: {
          round: foundRound,
        },
      });
    }

    return NextResponse.json({ submission: newSubmission });
  } catch (error) {
    console.error("Error submitting song:", error);
    return NextResponse.json(
      { error: "Failed to submit song" },
      { status: 500 }
    );
  }
}
