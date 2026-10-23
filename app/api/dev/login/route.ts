import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/databaseTypes';
import { getCollection } from '@/lib/mongodb';
import { createSessionToken } from '@/lib/auth';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/sessionCookie';

/**
 * Sandbox-only login (pnpm dev:sandbox). Signs in as a seeded fake user without
 * Spotify. Returns 404 unless the server was started with SANDBOX=1.
 *
 *   /api/dev/login                 -> jason
 *   /api/dev/login?userName=mayac  -> mayac
 *   &next=/leagues/...             -> where to land (default /)
 */
export async function GET(request: NextRequest) {
  if (process.env.SANDBOX !== '1') {
    return new NextResponse('Not found', { status: 404 });
  }

  const userName = request.nextUrl.searchParams.get('userName') ?? 'jason';
  const next = request.nextUrl.searchParams.get('next');
  const redirectTo = next && /^\/(?!\/)/.test(next) ? next : '/';

  const usersCollection = await getCollection<User>('users');
  const user = await usersCollection.findOne({ userName });
  if (!user) {
    return NextResponse.json(
      { error: `No sandbox user "${userName}"` },
      { status: 404 },
    );
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(user),
    sessionCookieOptions,
  );

  // Fake Spotify cookies: the home page only checks that one exists. Spotify
  // calls made with them simply fail.
  const oneYear = 60 * 60 * 24 * 365;
  const base = { sameSite: 'lax' as const, path: '/' };
  response.cookies.set('spotify_access_token', 'sandbox-access-token', {
    ...base,
    maxAge: 60 * 60,
  });
  response.cookies.set('spotify_refresh_token', 'sandbox-refresh-token', {
    ...base,
    maxAge: oneYear,
  });
  response.cookies.set(
    'spotify_token_expires_at',
    (Date.now() + 60 * 60 * 1000).toString(),
    { ...base, maxAge: oneYear },
  );
  return response;
}
