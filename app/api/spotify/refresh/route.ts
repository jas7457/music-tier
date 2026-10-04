import { NextRequest, NextResponse } from 'next/server';
import {
  refreshAccessToken,
  SpotifyRefreshTokenExpiredError,
} from '@/lib/spotify';
import {
  deleteSpotifyTokenCookies,
  setSpotifyTokenCookies,
} from '@/lib/spotifyCookies';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'No refresh token available' },
      { status: 401 },
    );
  }

  try {
    const tokenData = await refreshAccessToken(refreshToken);
    const response = NextResponse.json({ success: true });
    setSpotifyTokenCookies(response, tokenData);
    return response;
  } catch (error) {
    if (error instanceof SpotifyRefreshTokenExpiredError) {
      // Refresh token is past its 6-month lifetime. Discard the stored
      // tokens and signal the client to send the user through sign-in again.
      const response = NextResponse.json(
        { error: 'invalid_grant' },
        { status: 401 },
      );
      deleteSpotifyTokenCookies(response);
      return response;
    }
    console.error('Error refreshing Spotify token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 },
    );
  }
}
