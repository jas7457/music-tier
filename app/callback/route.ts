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

  const accessToken = await callbackAuth(code);
  const response = NextResponse.redirect(new URL("/", urlToUse));
  response.cookies.set("spotify_access_token", accessToken, {
    maxAge: 86400,
  });
  return response;
}
