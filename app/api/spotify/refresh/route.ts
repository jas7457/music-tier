import { NextRequest, NextResponse } from 'next/server';
import {
  refreshAccessToken,
  SpotifyRefreshTokenExpiredError,
} from '@/lib/spotify';

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

    // Update access token
    response.cookies.set('spotify_access_token', tokenData.access_token, {
      maxAge: tokenData.expires_in,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    const ONE_YEAR = 60 * 60 * 24 * 365;

    // Update refresh token if a new one was provided
    response.cookies.set('spotify_refresh_token', tokenData.refresh_token, {
      maxAge: ONE_YEAR, // 1 year
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Update expiration timestamp
    const expiresAt = Date.now() + tokenData.expires_in * 1000;
    response.cookies.set('spotify_token_expires_at', expiresAt.toString(), {
      maxAge: ONE_YEAR,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    if (error instanceof SpotifyRefreshTokenExpiredError) {
      // Refresh token is past its 6-month lifetime. Discard the stored
      // tokens and signal the client to send the user through sign-in again.
      const response = NextResponse.json(
        { error: 'invalid_grant' },
        { status: 401 },
      );
      response.cookies.delete('spotify_access_token');
      response.cookies.delete('spotify_refresh_token');
      response.cookies.delete('spotify_token_expires_at');
      return response;
    }
    console.error('Error refreshing Spotify token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 },
    );
  }
}
