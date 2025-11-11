import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken } from "@/lib/data";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;

  if (!sessionToken) {
    return NextResponse.json({ user: null });
  }

  const user = await getUserBySessionToken(sessionToken);
  return NextResponse.json({ user });
}
