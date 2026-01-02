import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { Round } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";
import { roundNotifications } from "@/lib/notifications";
import { getUserLeagues } from "@/lib/data";
import { getAllRounds } from "@/lib/utils/getAllRounds";
import { setScheduledNotifications } from "@/lib/scheduledNotifications";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ leagueId: string }> }
) {
  const params = await props.params;
  const { leagueId } = params;
  return handleRequest(request, { leagueId, method: "ADD" });
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ leagueId: string }> }
) {
  const params = await props.params;
  const { leagueId } = params;
  return handleRequest(request, { leagueId, method: "UPDATE" });
}

async function handleRequest(
  request: NextRequest,
  { leagueId, method }: { leagueId: string; method: "ADD" | "UPDATE" }
) {
  const now = Date.now();
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      roundId,
      isBonusRound: _isBonusRound,
      isKickoffRound: _isKickoffRound,
    } = body;
    const isBonusRound = Boolean(_isBonusRound);
    const isKickoffRound = Boolean(_isKickoffRound);

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    if (method === "UPDATE" && !roundId) {
      return NextResponse.json(
        { error: "Round ID is required for update" },
        { status: 400 }
      );
    }

    const getLeagueData = async () => {
      const userLeagues = await getUserLeagues(payload.userId);
      for (const league of userLeagues) {
        if (league._id === leagueId) {
          const allRounds = getAllRounds(league, {
            includeFake: false,
            includePending: true,
          });

          const existingRound = allRounds.find(
            (round) =>
              round.creatorId === payload.userId &&
              !round.isBonusRound &&
              !round.isKickoffRound
          );
          const existingBonusRound = allRounds.find(
            (round) => round.creatorId === payload.userId && round.isBonusRound
          );
          const existingKickoffRound = allRounds.find(
            (round) =>
              round.creatorId === payload.userId && round.isKickoffRound
          );

          return {
            league,
            existingRound,
            existingBonusRound,
            existingKickoffRound,
          };
        }
      }

      return {
        league: null,
        existingRound: null,
        existingBonusRound: null,
        existingKickoffRound: null,
      };
    };

    const { league, existingRound, existingBonusRound, existingKickoffRound } =
      await getLeagueData();

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

    if (method === "ADD" && existingBonusRound && isBonusRound) {
      return NextResponse.json(
        { error: "You have already created a bonus round for this league" },
        { status: 400 }
      );
    }
    if (method === "ADD" && existingKickoffRound && isKickoffRound) {
      return NextResponse.json(
        { error: "You have already created a kickoff round for this league" },
        { status: 400 }
      );
    }
    if (method === "ADD" && existingRound && !isBonusRound && !isKickoffRound) {
      return NextResponse.json(
        { error: "You have already created a round for this league" },
        { status: 400 }
      );
    }

    const roundsCollection = await getCollection<Round>("rounds");

    const newRound = await (async () => {
      if (method === "ADD") {
        // Create the round
        const newRound: Round = {
          _id: new ObjectId(),
          leagueId: leagueId,
          title: title.trim(),
          description: description.trim(),
          creatorId: payload.userId,
          isBonusRound: Boolean(isBonusRound),
          isKickoffRound: Boolean(isKickoffRound),
          submissionDate: now,
          lastUpdatedDate: now,
        };

        const result = await roundsCollection.insertOne(newRound);
        return { ...newRound, _id: result.insertedId.toString() };
      } else {
        // Update existing round
        const result = await roundsCollection.findOneAndUpdate(
          { _id: new ObjectId(roundId) },
          {
            $set: {
              title: title.trim(),
              description: description.trim(),
              lastUpdatedDate: now,
            },
          },
          { returnDocument: "after" }
        );
        if (!result) {
          throw new Error("No round found to update");
        }
        return { ...result, _id: result._id.toString() };
      }
    })();

    const newData = await getLeagueData();

    await Promise.all([
      roundNotifications({
        isNewRound: method === "ADD",
        round: { _id: newRound._id, isBonusRound, isKickoffRound },
        before: {
          league,
        },
        after: {
          league: newData.league!,
        },
      }),
      setScheduledNotifications(newData.league),
    ]);

    triggerRealTimeUpdate();

    return NextResponse.json({
      success: true,
      round: newRound,
    });
  } catch (error) {
    console.error("Error creating round:", error);
    return NextResponse.json(
      { error: "Failed to create round" },
      { status: 500 }
    );
  }
}
