import type { NextResponse } from 'next/server';

const ONE_YEAR = 60 * 60 * 24 * 365;

export const SPOTIFY_COOKIES = [
  'spotify_access_token',
  'spotify_refresh_token',
  'spotify_token_expires_at',
] as const;

/** Stores freshly refreshed Spotify tokens on a response. */
export function setSpotifyTokenCookies(
  response: NextResponse,
  tokenData: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  },
) {
  const base = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
  response.cookies.set('spotify_access_token', tokenData.access_token, {
    ...base,
    maxAge: tokenData.expires_in,
  });
  response.cookies.set('spotify_refresh_token', tokenData.refresh_token, {
    ...base,
    maxAge: ONE_YEAR,
  });
  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  response.cookies.set('spotify_token_expires_at', expiresAt.toString(), {
    ...base,
    maxAge: ONE_YEAR,
  });
}

export function deleteSpotifyTokenCookies(response: NextResponse) {
  for (const name of SPOTIFY_COOKIES) {
    response.cookies.delete(name);
  }
}
