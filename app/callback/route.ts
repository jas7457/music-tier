import { NextRequest, NextResponse } from "next/server";
import { callbackAuth } from "@/lib/spotify";

const DEV_URL = `https://127.0.0.1:3000`;

export async function GET(request: NextRequest) {
  const queryParams = request.nextUrl.searchParams;
  const code = queryParams.get("code");

  const urlToUse =
    process.env.NODE_ENV === "development" ? DEV_URL : request.url;

  if (!code) {
    return NextResponse.redirect(new URL("/", urlToUse));
  }

  const tokenData = await callbackAuth(code);
  const response = NextResponse.redirect(new URL("/", urlToUse));

  // Store access token (expires in 1 hour typically)
  response.cookies.set("spotify_access_token", tokenData.access_token, {
    maxAge: tokenData.expires_in,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  // Store refresh token (long-lived, used to get new access tokens)
  response.cookies.set("spotify_refresh_token", tokenData.refresh_token, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  // Store expiration timestamp
  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  response.cookies.set("spotify_token_expires_at", expiresAt.toString(), {
    maxAge: tokenData.expires_in,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return response;
}
