import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
  }

  // Get token from cookies (server-side)
  const cookieStore = request.cookies;
  const accessToken = cookieStore.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Spotify API error" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform the results into a simpler format
    const tracks = data.tracks.items.map((track: any) => ({
      trackId: track.id,
      title: track.name,
      artists: track.artists.map((artist: any) => artist.name),
      albumName: track.album.name,
      albumImageUrl: track.album.images[0]?.url || "",
    }));

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Error searching Spotify:", error);
    return NextResponse.json(
      { error: "Failed to search Spotify" },
      { status: 500 }
    );
  }
}
