import { NextRequest, NextResponse } from "next/server";
import {
  getDueNotifications,
  markNotificationCompleted,
  markNotificationFailed,
} from "@/lib/scheduledNotifications";
import { sendNotifications } from "@/lib/notifications";
import { unknownToErrorString } from "@/lib/utils/unknownToErrorString";
import { getLeagueById } from "@/lib/data";
import { assertNever } from "@/lib/utils/never";
import { PopulatedLeague } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for processing

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    // In production, you should verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization");
    if (
      process.env.NODE_ENV === "production" &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await getDueNotifications();
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };
    const leaguesById: Record<
      string,
      Promise<PopulatedLeague | undefined>
    > = {};

    for (const task of tasks) {
      results.processed++;

      if (task.userIds.length === 0) {
        await markNotificationFailed(
          task._id,
          `No users found for league ${task.leagueId}`
        );
        continue;
      }

      leaguesById[task.leagueId] ??= getLeagueById(
        task.leagueId,
        task.userIds[0]
      );
      const league = await leaguesById[task.leagueId];
      if (!league) {
        await markNotificationFailed(
          task._id,
          `League ${task.leagueId} not found`
        );
        continue;
      }

      try {
        switch (task.type) {
          case "SUBMISSION.REMINDER":
          case "VOTING.REMINDER": {
            const notification = task.data.notification;
            await sendNotifications(
              [
                {
                  ...notification,
                  userIds: task.userIds,
                },
              ],
              league
            );
            break;
          }

          default: {
            assertNever(task);
          }
        }

        await markNotificationCompleted(task._id);
        results.succeeded++;
      } catch (error) {
        const errorMessage = unknownToErrorString(error, "Unknown error");
        await markNotificationFailed(task._id, errorMessage);
        results.failed++;
        results.errors.push(`Task ${task._id} failed: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorText = unknownToErrorString(error, "Unknown error");
    return NextResponse.json(
      {
        error: errorText,
      },
      { status: 500 }
    );
  }
}
