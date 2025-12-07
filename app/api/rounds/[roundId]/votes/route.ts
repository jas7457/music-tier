import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { Vote } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";
import { getUserLeagues } from "@/lib/data";
import { getAllRounds } from "@/lib/utils/getAllRounds";
import { voteNotifications } from "@/lib/notifications";
import { setScheduledNotifications } from "@/lib/scheduledNotifications";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ roundId: string }> }
) {
  const params = await props.params;
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { roundId } = params;
    if (!roundId) {
      return NextResponse.json(
        { error: "Round ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const getData = async () => {
      const userLeagues = await getUserLeagues(payload.userId);
      for (const league of userLeagues) {
        const leagueRounds = getAllRounds(league, {
          includePending: false,
          includeFake: false,
        });
        for (const round of leagueRounds) {
          if (round._id === roundId) {
            return { round, league };
          }
        }
      }
      return { round: null, league: null };
    };

    const { round, league } = await getData();

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    // Get the round and league to validate
    const votesCollection = await getCollection<Vote>("votes");
    await votesCollection.deleteMany({ userId: payload.userId, roundId });

    const now = Date.now();

    const data = Object.entries(body).map(([submissionId, entry]) => {
      const { points, note, userGuessId } = entry as {
        points: number;
        note?: string;
        userGuessId?: string;
      };
      return {
        _id: new ObjectId(),
        voteDate: now,
        submissionId,
        points,
        note,
        userGuessId,
        userId: payload.userId,
        roundId,
      };
    });

    await votesCollection.insertMany(data);

    const newData = await getData();

    await Promise.all([
      setScheduledNotifications(newData.league),
      voteNotifications({
        before: {
          league,
          round,
        },
        after: {
          league: newData.league || undefined,
          round: newData.round || undefined,
        },
      }),
    ]);

    triggerRealTimeUpdate();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving vote:", error);
    return NextResponse.json(
      { error: "Failed to submit vote" },
      { status: 500 }
    );
  }
}
