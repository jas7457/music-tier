import { NextRequest, NextResponse } from 'next/server';
import { getTrackDetails } from '@/lib/spotify';

export async function GET(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const accessToken = request.cookies.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Spotify access token found' },
        { status: 401 }
      );
    }

    const { trackId } = params;
    const track = await getTrackDetails(trackId, accessToken);

    return NextResponse.json({ track });
  } catch (error) {
    console.error('Error fetching track details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch track details' },
      { status: 500 }
    );
  }
}
