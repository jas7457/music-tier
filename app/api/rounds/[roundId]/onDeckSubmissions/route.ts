import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { OnDeckSongSubmission } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";
import { SIDE_PLAYLIST_ID } from "@/lib/utils/constants";
import { cookies } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  return handleRequest(request, { roundId: params.roundId });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  return handleRequest(request, { roundId: params.roundId });
}

async function handleRequest(
  request: NextRequest,
  { roundId }: { roundId: string }
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
    const { action } = body;

    const onDeckSongSubmissions = await getCollection<OnDeckSongSubmission>(
      "onDeckSongSubmissions"
    );

    const currentSubmissions = await onDeckSongSubmissions
      .find({
        roundId,
        userId: payload.userId,
      })
      .toArray();

    switch (action) {
      case "update": {
        const { payload: data } = body;

        if (!data || !data.onDeckSubmissions) {
          return NextResponse.json(
            { error: "On deck submissions are required" },
            { status: 400 }
          );
        }
        const { onDeckSubmissions } = data;
        await onDeckSongSubmissions.deleteMany({
          roundId,
          userId: payload.userId,
          "trackInfo.trackId": {
            $nin: onDeckSubmissions.map((s: any) => s.trackInfo.trackId),
          },
        });

        const newSubmissions = onDeckSubmissions.filter((submission: any) => {
          return !currentSubmissions.some(
            (current) =>
              current.trackInfo.trackId === submission.trackInfo.trackId
          );
        });

        if (newSubmissions.length > 0) {
          await onDeckSongSubmissions.insertMany(
            newSubmissions.map((submission: any) => {
              const populatedSubmission: OnDeckSongSubmission = {
                _id: new ObjectId(),
                roundId,
                userId: payload.userId,
                trackInfo: submission.trackInfo,
                isAddedToSidePlaylist: false,
              };
              return populatedSubmission;
            })
          );
        }

        triggerRealTimeUpdate({ userIds: [payload.userId] });
        return NextResponse.json({ success: true });
      }
      case "saveToSidePlaylist": {
        if (currentSubmissions.length === 0) {
          return NextResponse.json(
            { error: "No on deck submissions to save" },
            { status: 400 }
          );
        }

        const cookieStore = cookies();
        const accessToken = cookieStore.get("spotify_access_token")?.value;

        const res = await fetch(
          `https://api.spotify.com/v1/playlists/${SIDE_PLAYLIST_ID}/tracks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: currentSubmissions
                .filter((submission) => !submission.isAddedToSidePlaylist)
                .map(
                  (submission) =>
                    `spotify:track:${submission.trackInfo.trackId}`
                ),
            }),
          }
        );

        if (!res.ok) {
          throw new Error(
            `Failed to add tracks: ${res.status} ${await res.text()}`
          );
        }

        await onDeckSongSubmissions.updateMany(
          {
            roundId,
            userId: payload.userId,
          },
          {
            $set: {
              isAddedToSidePlaylist: true,
            },
          }
        );

        triggerRealTimeUpdate({ userIds: [payload.userId] });
        return NextResponse.json({ success: true });
      }
    }
  } catch (error) {
    console.error("Error submitting on deck submission:", error);
    return NextResponse.json(
      { error: "Failed to submit on deck submission" },
      { status: 500 }
    );
  }
}
