import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/databaseTypes';
import { getCollection } from '@/lib/mongodb';
import { createSessionToken } from '@/lib/auth';
import {
  getSpotifyUserProfile,
  refreshAccessToken,
  SpotifyRefreshTokenExpiredError,
} from '@/lib/spotify';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/sessionCookie';
import {
  deleteSpotifyTokenCookies,
  setSpotifyTokenCookies,
} from '@/lib/spotifyCookies';
import { RESTORE_FAILED_COOKIE } from '@/lib/sessionRestore';

/**
 * Silently signs someone back in when their app session is gone but their
 * Spotify refresh token is still valid. proxy.ts sends page loads here; on
 * success the session is re-issued and they land on the page they asked for,
 * without ever seeing "Connect to Spotify".
 */
export async function GET(request: NextRequest) {
  const redirectTo = getSafeRedirect(request.nextUrl.searchParams.get('next'));
  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  // Never cache this redirect.
  response.headers.set('Cache-Control', 'no-store');

  const refreshToken = request.cookies.get('spotify_refresh_token')?.value;
  if (!refreshToken) {
    return response;
  }

  try {
    const tokenData = await refreshAccessToken(refreshToken);
    // Keep the refreshed Spotify tokens even if no account is found, so the
    // landing page can go straight to sign-up with this Spotify profile.
    setSpotifyTokenCookies(response, tokenData);

    const profile = await getSpotifyUserProfile(tokenData.access_token);
    const usersCollection = await getCollection<User>('users');
    const user = await usersCollection.findOne({ spotifyId: profile.id });
    if (!user) {
      markFailed(response);
      return response;
    }

    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(user),
      sessionCookieOptions,
    );
    response.cookies.delete(RESTORE_FAILED_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof SpotifyRefreshTokenExpiredError) {
      // The refresh token is dead; the user has to reconnect Spotify.
      deleteSpotifyTokenCookies(response);
    } else {
      console.error('Error restoring session:', error);
      // Spotify or the database had a hiccup: don't retry on every page load.
      markFailed(response);
    }
    return response;
  }
}

// Stops proxy.ts from sending every page load back here after a failure.
function markFailed(response: NextResponse) {
  response.cookies.set(RESTORE_FAILED_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
}

// Only allow redirects back into this app.
function getSafeRedirect(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }
  return next;
}
