import { verifySessionToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export interface ErrorLogPayload {
  message: string;
  stack?: string;
  userAgent?: string;
  url?: string;
  context?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const payload: ErrorLogPayload = await request.json();
    const userPayload = await verifySessionToken();
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Format error log with all relevant details
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: payload.message,
      stack: payload.stack,
      url: payload.url,
      userAgent: payload.userAgent,
      userId: userPayload.userId,
    };

    // Log to Vercel's runtime logs
    console.error("=== CLIENT ERROR ===");
    console.error(JSON.stringify(errorLog, null, 2));
    console.error("===================");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to log client error:", error);
    return NextResponse.json({ error: "Failed to log error" }, { status: 500 });
  }
}
