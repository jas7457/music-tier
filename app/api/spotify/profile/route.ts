import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyUserProfile } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Spotify access token found' },
        { status: 401 }
      );
    }

    const profile = await getSpotifyUserProfile(accessToken);

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching Spotify profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Spotify profile' },
      { status: 500 }
    );
  }
}
