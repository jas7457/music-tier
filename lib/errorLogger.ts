"user client";

import { ErrorLogPayload } from "@/app/api/logError/route";

/**
 * Logs client-side errors to the server for Vercel runtime logs
 */
export async function logError(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    await fetch("/api/logError", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: errorMessage,
        stack: errorStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        context,
      } satisfies ErrorLogPayload),
    });
  } catch (loggingError) {
    // Fail silently to avoid infinite loops
    console.error("Failed to log error:", loggingError);
  }
}
