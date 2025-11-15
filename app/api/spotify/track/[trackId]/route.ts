import { NextRequest, NextResponse } from "next/server";
import { getTrackDetails } from "@/lib/spotify";
import { PopulatedTrackInfo } from "@/lib/types";

export type GETReponse =
  | { error: string; track?: never }
  | { track: PopulatedTrackInfo; error?: never };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
): Promise<NextResponse<GETReponse>> {
  try {
    const accessToken = request.cookies.get("spotify_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No Spotify access token found" },
        { status: 401 }
      );
    }

    const { trackId } = await params;
    const track = await getTrackDetails(trackId, accessToken);

    return NextResponse.json({ track });
  } catch (error) {
    console.error("Error fetching track details:", error);
    return NextResponse.json(
      { error: `Failed to fetch track details: ${error}` },
      { status: 500 }
    );
  }
}
