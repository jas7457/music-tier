import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear session token
  response.cookies.delete('session_token');

  // Also clear Spotify token
  response.cookies.delete('spotify_access_token');

  return response;
}
