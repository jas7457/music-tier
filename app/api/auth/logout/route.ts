import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear session token
  response.cookies.delete('session_token');

  // Clear all Spotify tokens
  response.cookies.delete('spotify_access_token');
  response.cookies.delete('spotify_refresh_token');
  response.cookies.delete('spotify_token_expires_at');

  return response;
}
