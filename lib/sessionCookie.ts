import jwt from 'jsonwebtoken';

/*
 * Session token + cookie helpers. Kept free of `next/headers` so proxy.ts can
 * use them too.
 *
 * Sessions slide: proxy.ts re-issues the token (at most once a day) while the
 * app is in use, so people who use the app never get signed out. Someone who
 * stays away longer than SESSION_MAX_AGE_SECONDS is signed back in silently
 * from their Spotify refresh token (see /api/auth/restore).
 */

export const SESSION_COOKIE = 'session_token';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days
// Re-issue the token once it's this old, so active sessions keep sliding.
export const SESSION_RENEW_AFTER_SECONDS = 60 * 60 * 24; // 1 day

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export interface SessionPayload {
  userId: string;
  spotifyId?: string;
  userName: string;
}

export function signSessionToken(payload: SessionPayload): string {
  // Only the identity fields go in, never iat/exp from a previous token.
  const { userId, spotifyId, userName } = payload;
  return jwt.sign({ userId, spotifyId, userName }, JWT_SECRET, {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

/** The decoded token, or null if it's missing, invalid or expired. */
export function decodeSessionToken(
  token: string | undefined,
): (SessionPayload & { iat?: number }) | null {
  if (!token) {
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload & { iat?: number };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  // Only the server ever reads the session.
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};
