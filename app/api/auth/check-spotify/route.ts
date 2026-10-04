import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { User } from '@/databaseTypes';
import { createSessionToken } from '@/lib/auth';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/sessionCookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spotifyId } = body;

    if (!spotifyId) {
      return NextResponse.json(
        { error: 'Spotify ID is required' },
        { status: 400 },
      );
    }

    const usersCollection = await getCollection<User>('users');
    const user = await usersCollection.findOne({ spotifyId });

    if (!user) {
      return NextResponse.json({ exists: false, user: null });
    }

    // User exists, create session token and log them in
    const sessionToken = createSessionToken(user);

    const response = NextResponse.json({ exists: true, user });
    response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions);

    return response;
  } catch (error) {
    console.error('Error checking Spotify user:', error);
    return NextResponse.json(
      { error: 'Failed to check user' },
      { status: 500 },
    );
  }
}
