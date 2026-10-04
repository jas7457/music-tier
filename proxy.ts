import { NextRequest, NextResponse } from 'next/server';
import {
  decodeSessionToken,
  SESSION_COOKIE,
  SESSION_RENEW_AFTER_SECONDS,
  sessionCookieOptions,
  signSessionToken,
} from '@/lib/sessionCookie';
import { RESTORE_FAILED_COOKIE, RESTORE_PATH } from '@/lib/sessionRestore';

/**
 * Keeps people signed in:
 * - A valid session is re-issued (at most once a day) so it keeps sliding
 *   forward while the app is in use.
 * - A missing/expired session with a Spotify refresh token still around is
 *   restored silently via /api/auth/restore on the next page load.
 */
export function proxy(request: NextRequest) {
  const session = decodeSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (session) {
    const ageSeconds = Date.now() / 1000 - (session.iat ?? 0);
    if (ageSeconds < SESSION_RENEW_AFTER_SECONDS) {
      return NextResponse.next();
    }
    const token = signSessionToken(session);
    // Set on the forwarded request too, so this render sees the new token.
    request.cookies.set(SESSION_COOKIE, token);
    const response = NextResponse.next({ request });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  }

  const canRestore =
    request.method === 'GET' &&
    isPageNavigation(request) &&
    request.cookies.has('spotify_refresh_token') &&
    !request.cookies.has(RESTORE_FAILED_COOKIE) &&
    !request.nextUrl.pathname.startsWith('/api/') &&
    request.nextUrl.pathname !== '/callback';

  if (canRestore) {
    const restoreUrl = new URL(RESTORE_PATH, request.url);
    restoreUrl.searchParams.set(
      'next',
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(restoreUrl);
  }

  return NextResponse.next();
}

// Only full page loads get redirected; client-side navigations (RSC fetches)
// and prefetches would just break on a redirect to a route handler.
function isPageNavigation(request: NextRequest) {
  if (
    request.headers.has('rsc') ||
    request.headers.has('next-router-prefetch')
  ) {
    return false;
  }
  const dest = request.headers.get('sec-fetch-dest');
  if (dest) {
    return dest === 'document';
  }
  return request.headers.get('accept')?.includes('text/html') ?? false;
}

export const config = {
  matcher: [
    // Everything except static assets and files served from /public.
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-|audio/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp3|wav|json|js|css|txt)$).*)',
  ],
};
