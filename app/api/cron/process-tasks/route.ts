import { NextResponse } from 'next/server';
import {
  getDueNotifications,
  markNotificationCompleted,
  markNotificationFailed,
} from '@/lib/scheduledNotifications';
import { sendNotifications } from '@/lib/notifications';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';
import { getLeagueById } from '@/lib/data';
import { assertNever } from '@/lib/utils/never';
import { PopulatedLeague } from '@/lib/types';
import { triggerRealTimeUpdate } from '@/lib/pusher-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for processing

export async function GET() {
  try {
    // Verify this is a legitimate cron request
    // In production, you should verify the request is from Vercel Cron
    /*
    const authHeader = request.headers.get("authorization");
    if (
      process.env.NODE_ENV === "production" &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    */

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
    // Whether any phase-transition notification was processed. These fire when
    // a round actually advances (for auto-start-off leagues), so we nudge open
    // clients to refetch afterwards and pick up the new stage without a reload.
    let didAdvancePhase = false;

    for (const task of tasks) {
      results.processed++;

      if (task.userIds.length === 0) {
        results.succeeded++;
        continue;
      }

      leaguesById[task.leagueId] ??= getLeagueById(
        task.leagueId,
        task.userIds[0],
      );
      const league = await leaguesById[task.leagueId];
      if (!league) {
        await markNotificationFailed(
          task._id,
          `League ${task.leagueId} not found`,
        );
        continue;
      }

      try {
        switch (task.type) {
          case 'VOTING.STARTED':
          case 'ROUND.COMPLETED':
          case 'LEAGUE.COMPLETED': {
            didAdvancePhase = true;
            const notification = task.data.notification;
            await sendNotifications(
              [
                {
                  ...notification,
                  userIds: task.userIds,
                },
              ],
              league,
            );
            break;
          }
          case 'SUBMISSION.REMINDER':
          case 'VOTING.REMINDER': {
            const notification = task.data.notification;
            await sendNotifications(
              [
                {
                  ...notification,
                  userIds: task.userIds,
                },
              ],
              league,
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
        const errorMessage = unknownToErrorString(error, 'Unknown error');
        await markNotificationFailed(task._id, errorMessage);
        results.failed++;
        results.errors.push(`Task ${task._id} failed: ${errorMessage}`);
      }
    }

    // A phase advanced purely on the clock, so no user action pushed an update.
    // Nudge open clients to refetch and reflect the new stage.
    if (didAdvancePhase) {
      await triggerRealTimeUpdate();
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorText = unknownToErrorString(error, 'Unknown error');
    return NextResponse.json(
      {
        error: errorText,
      },
      { status: 500 },
    );
  }
}
