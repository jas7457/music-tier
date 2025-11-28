import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { Round } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";
import { roundNotifications } from "@/lib/notifications";
import { getUserLeagues } from "@/lib/data";
import { getAllRounds } from "@/lib/utils/getAllRounds";

export async function POST(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  try {
    const payload = verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { leagueId } = params;
    const body = await request.json();
    const { title, description, isBonusRound: _isBonusRound } = body;
    const isBonusRound = Boolean(_isBonusRound);

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const userLeagues = await getUserLeagues(payload.userId);
    const { league, existingRound, existingBonusRound } = (() => {
      for (const league of userLeagues) {
        if (league._id === leagueId) {
          const allRounds = getAllRounds(league, {
            includeFake: false,
            includePending: true,
          });

          const existingRound = allRounds.find(
            (round) => round.creatorId === payload.userId && !round.isBonusRound
          );
          const existingBonusRound = allRounds.find(
            (round) => round.creatorId === payload.userId && round.isBonusRound
          );

          return { league, existingRound, existingBonusRound };
        }
      }

      return {
        league: null,
        existingRound: null,
        existingBonusRound: null,
      };
    })();

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Verify user is in the league
    if (!league.users.map((user) => user._id).includes(payload.userId)) {
      return NextResponse.json(
        { error: "You are not a member of this league" },
        { status: 403 }
      );
    }

    if (existingBonusRound && isBonusRound) {
      return NextResponse.json(
        { error: "You have already created a bonus round for this league" },
        { status: 400 }
      );
    }
    if (existingRound && !isBonusRound) {
      return NextResponse.json(
        { error: "You have already created a round for this league" },
        { status: 400 }
      );
    }

    // Create the round
    const newRound: Round = {
      _id: new ObjectId(),
      leagueId: leagueId,
      title: title.trim(),
      description: description.trim(),
      creatorId: payload.userId,
      isBonusRound: Boolean(isBonusRound),
    };

    const roundsCollection = await getCollection<Round>("rounds");
    const result = await roundsCollection.insertOne(newRound);
    triggerRealTimeUpdate();
    await roundNotifications({
      userId: payload.userId,
      round: { _id: result.insertedId.toString() },
      before: {
        league,
        round: isBonusRound ? existingBonusRound! : existingRound!,
      },
    });

    return NextResponse.json({
      success: true,
      round: {
        ...newRound,
        _id: result.insertedId.toString(),
      },
    });
  } catch (error) {
    console.error("Error creating round:", error);
    return NextResponse.json(
      { error: "Failed to create round" },
      { status: 500 }
    );
  }
}
