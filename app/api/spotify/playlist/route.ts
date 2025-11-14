import { NextRequest, NextResponse } from "next/server";
import { getUserByCookies } from "@/lib/data";
import { triggerRealTimeUpdate } from "@/lib/pusher-server";
import { getCollection } from "@/lib/mongodb";
import { Round } from "@/databaseTypes";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserByCookies("");

    if (!user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const accessToken = request.cookies.get("spotify_access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { error: "No Spotify access token found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, songs, roundId } = body;
    if (!name || !description || !roundId || !songs || !Array.isArray(songs)) {
      return NextResponse.json({ error: "Incorrect data" }, { status: 400 });
    }

    const response = await fetch(
      `https://api.spotify.com/v1/users/${user.spotifyId}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          public: true,
        }),
      }
    );
    if (!response.ok) {
      try {
        const errorData = await response.json();
        return NextResponse.json(
          { error: `Spotify API error: ${errorData.error.message}` },
          { status: response.status }
        );
      } catch {
        return NextResponse.json(
          { error: `Spotify API error: ${response.statusText}` },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    const playlistId = data.id;

    const addTracksResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: songs,
          position: 0,
        }),
      }
    );
    if (!addTracksResponse.ok) {
      try {
        const errorData = await addTracksResponse.json();
        return NextResponse.json(
          { error: `Spotify API error: ${errorData.error.message}` },
          { status: addTracksResponse.status }
        );
      } catch {
        return NextResponse.json(
          { error: `Spotify API error: ${addTracksResponse.statusText}` },
          { status: addTracksResponse.status }
        );
      }
    }

    const jsonResponse = await addTracksResponse.json();

    const roundsCollection = await getCollection<Round>("rounds");

    // TODO - make sure the round belongs to the user
    await roundsCollection.updateOne(
      { _id: new ObjectId(roundId) },
      { $set: { spotifyPlaylistId: playlistId } }
    );

    triggerRealTimeUpdate();

    return NextResponse.json({
      success: true,
      playlistId,
      snapshotId: jsonResponse.snapshot_id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to create spotify playlist: ${error}` },
      { status: 500 }
    );
  }
}
