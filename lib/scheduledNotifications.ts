import { ObjectId } from "mongodb";
import { getDatabase } from "./mongodb";
import type { ScheduledNotification } from "@/databaseTypes";
import { formatDateWithTime } from "./utils/formatDate";
import { PopulatedLeague } from "./types";

export async function setScheduledNotifications(
  league: PopulatedLeague | null | undefined
) {
  if (!league) {
    return;
  }
  try {
    const scheduledNotifications: Array<ScheduledNotification> = [];

    const getTimeBefore = (timestamp: number, hours = 12) =>
      timestamp - hours * 60 * 60 * 1000;

    (() => {
      const currentRound = league.rounds.current;
      if (!currentRound || currentRound.isPending) {
        return;
      }

      switch (currentRound.stage) {
        case "completed":
        case "unknown":
        case "upcoming": {
          return;
        }
        case "submission": {
          const unsubmittedUsers = league.users.filter((user) => {
            const hasSubmitted = currentRound.submissions.some(
              (submission) => submission.userId === user._id
            );
            return !hasSubmitted;
          });
          if (unsubmittedUsers.length === 0) {
            return;
          }
          scheduledNotifications.push({
            _id: new ObjectId(),
            type: "SUBMISSION.REMINDER",
            status: "pending",
            leagueId: league._id,
            userIds: unsubmittedUsers.map((user) => user._id),
            executeAt: getTimeBefore(currentRound.submissionEndDate),
            data: {
              notification: {
                code: "SUBMISSION.REMINDER",
                title: "Round Submission Reminder",
                message: `Song submissions for ${
                  currentRound.title
                } are ending at ${formatDateWithTime(
                  currentRound.submissionEndDate
                )}. Make sure to get your submission in on time!`,
              },
            },
          });
          return;
        }
        case "voting":
        case "currentUserVotingCompleted": {
          const unvotedUsers = league.users.filter((user) => {
            const hasVoted = currentRound.votes.some(
              (vote) => vote.userId === user._id
            );
            return !hasVoted;
          });

          if (unvotedUsers.length === 0) {
            return;
          }
          scheduledNotifications.push({
            _id: new ObjectId(),
            type: "VOTING.REMINDER",
            status: "pending",
            leagueId: league._id,
            userIds: unvotedUsers.map((user) => user._id),
            executeAt: getTimeBefore(currentRound.votingEndDate),
            data: {
              notification: {
                code: "VOTING.REMINDER",
                title: "Round Voting Reminder",
                message: `Voting for ${
                  currentRound.title
                } is ending at ${formatDateWithTime(
                  currentRound.votingEndDate
                )}. Make sure to get your votes in on time!`,
              },
            },
          });
          return;
        }
      }
    })();

    const db = await getDatabase();
    const scheduledNotificationsCollection =
      db.collection<ScheduledNotification>("scheduledNotifications");
    await scheduledNotificationsCollection.deleteMany({ leagueId: league._id });

    if (scheduledNotifications.length > 0) {
      await scheduledNotificationsCollection.insertMany(scheduledNotifications);
    }
  } catch {}
}

/**
 * Get all pending notifications that are due to be executed
 */
export async function getDueNotifications(): Promise<ScheduledNotification[]> {
  const db = await getDatabase();
  const notificationsCollection = db.collection<ScheduledNotification>(
    "scheduledNotifications"
  );

  const now = Date.now();

  return await notificationsCollection
    .find({
      status: "pending",
      executeAt: { $lte: now },
    })
    .sort({ executeAt: 1 })
    .toArray();
}

/**
 * Mark a notification as completed
 */
export async function markNotificationCompleted(
  notificationId: ObjectId
): Promise<void> {
  const db = await getDatabase();
  const notificationsCollection = db.collection<ScheduledNotification>(
    "scheduledNotifications"
  );

  await notificationsCollection.updateOne(
    { _id: notificationId },
    {
      $set: {
        status: "completed",
        executedAt: Date.now(),
      },
    }
  );
}

/**
 * Mark a notification as failed
 */
export async function markNotificationFailed(
  notificationId: ObjectId,
  error: string
): Promise<void> {
  const db = await getDatabase();
  const notificationsCollection = db.collection<ScheduledNotification>(
    "scheduledNotifications"
  );

  await notificationsCollection.updateOne(
    { _id: notificationId },
    {
      $set: {
        status: "failed",
        executedAt: Date.now(),
        error,
      },
    }
  );
}
