import { NextRequest, NextResponse } from 'next/server';
import { callbackAuth, getRedirectUri } from '@/lib/spotify';

/**
 * The origin the user actually browsed to. Behind Vercel's proxy the forwarded
 * headers carry the public host — including the per-branch preview host — while
 * request.nextUrl can hold an internal one.
 */
function getOrigin(request: NextRequest): string {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');

  if (!host) {
    return request.nextUrl.origin;
  }

  const proto =
    request.headers.get('x-forwarded-proto') ??
    request.nextUrl.protocol.replace(':', '');

  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const queryParams = request.nextUrl.searchParams;
  const code = queryParams.get('code');

  const urlToUse = getOrigin(request);

  if (!code) {
    return NextResponse.redirect(new URL('/', urlToUse));
  }

  // Must match the redirect_uri sent to /authorize by the browser.
  const tokenData = await callbackAuth(code, getRedirectUri(urlToUse));
  const response = NextResponse.redirect(new URL('/', urlToUse));

  // Store access token (expires in 1 hour typically)
  response.cookies.set('spotify_access_token', tokenData.access_token, {
    maxAge: tokenData.expires_in,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  // Store refresh token (long-lived, used to get new access tokens)
  response.cookies.set('spotify_refresh_token', tokenData.refresh_token, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  // Store expiration timestamp
  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  response.cookies.set('spotify_token_expires_at', expiresAt.toString(), {
    maxAge: tokenData.expires_in,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return response;
}
