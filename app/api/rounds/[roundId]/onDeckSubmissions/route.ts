import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { OnDeckSongSubmission, SongSubmission } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";
import { SIDE_PLAYLIST_ID } from "@/lib/utils/constants";
import { cookies } from "next/headers";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ roundId: string }> }
) {
  const params = await props.params;
  return handleRequest(request, { roundId: params.roundId });
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ roundId: string }> }
) {
  const params = await props.params;
  return handleRequest(request, { roundId: params.roundId });
}

async function handleRequest(
  request: NextRequest,
  { roundId }: { roundId: string }
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

    const body = await request.json();
    const { action } = body;

    const onDeckSongSubmissions = await getCollection<OnDeckSongSubmission>(
      "onDeckSongSubmissions"
    );

    const currentOnDeckSubmissions = await onDeckSongSubmissions
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
          return !currentOnDeckSubmissions.some(
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
        const { payload: submissionsToAdd } = body as {
          payload?: Pick<
            OnDeckSongSubmission,
            "trackInfo" | "isAddedToSidePlaylist"
          >[];
        };

        if (currentOnDeckSubmissions.length === 0) {
          return NextResponse.json(
            { error: "No on deck submissions to save" },
            { status: 400 }
          );
        }

        // Get real submissions for this round to filter them out
        const songSubmissions = await getCollection<SongSubmission>(
          "songSubmissions"
        );
        const realSubmissions = await songSubmissions
          .find({ roundId })
          .toArray();

        const realSubmissionTrackIds = new Set(
          realSubmissions.map((s) => s.trackInfo.trackId)
        );

        const cookieStore = await cookies();
        const accessToken = cookieStore.get("spotify_access_token")?.value;

        // Filter out submissions that are already added to playlist OR are real submissions
        const tracksToAdd = (
          submissionsToAdd ?? currentOnDeckSubmissions
        ).filter(
          (onDeckSubmission) =>
            !onDeckSubmission.isAddedToSidePlaylist &&
            !realSubmissionTrackIds.has(onDeckSubmission.trackInfo.trackId)
        );

        if (tracksToAdd.length === 0) {
          triggerRealTimeUpdate({ userIds: [payload.userId] });

          return NextResponse.json({
            success: true,
            message: "No new tracks to add",
          });
        }

        const res = await fetch(
          `https://api.spotify.com/v1/playlists/${SIDE_PLAYLIST_ID}/tracks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: tracksToAdd.map(
                (onDeckSubmission) =>
                  `spotify:track:${onDeckSubmission.trackInfo.trackId}`
              ),
            }),
          }
        );

        if (!res.ok) {
          throw new Error(
            `Failed to add tracks: ${res.status} ${await res.text()}`
          );
        }

        // Only mark as added the ones we actually added (excluding real submissions)
        await onDeckSongSubmissions.updateMany(
          {
            roundId,
            userId: payload.userId,
            "trackInfo.trackId": {
              $in: tracksToAdd.map((s) => s.trackInfo.trackId),
            },
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
