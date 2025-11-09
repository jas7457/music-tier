import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { User } from '@/databaseTypes';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, userName, spotifyId, photoUrl } = body;

    // Validate required fields
    if (!firstName || !lastName || !userName) {
      return NextResponse.json(
        { error: 'First name, last name, and username are required' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection<User>('users');

    // Check if username already exists
    const existingUserByUsername = await usersCollection.findOne({ userName });
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Check if Spotify ID already exists
    if (spotifyId) {
      const existingUserBySpotify = await usersCollection.findOne({ spotifyId });
      if (existingUserBySpotify) {
        return NextResponse.json(
          { error: 'An account with this Spotify ID already exists' },
          { status: 409 }
        );
      }
    }

    // Create new user
    const userId = new ObjectId();
    const newUser: User = {
      _id: userId.toString(),
      firstName,
      lastName,
      userName,
      spotifyId,
      photoUrl,
    };

    await usersCollection.insertOne({ ...newUser, _id: userId } as any);

    // Create session token
    const sessionToken = createSessionToken(newUser);

    // Set cookie
    const response = NextResponse.json({ user: newUser });
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
