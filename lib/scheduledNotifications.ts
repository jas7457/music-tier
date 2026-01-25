import { ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';
import type { ScheduledNotification } from '@/databaseTypes';
import { formatDateWithTime } from './utils/formatDate';
import { PopulatedLeague } from './types';

export async function setScheduledNotifications(
  league: PopulatedLeague | null | undefined,
) {
  if (!league) {
    return;
  }
  try {
    const db = await getDatabase();
    const scheduledNotificationsCollection =
      db.collection<ScheduledNotification>('scheduledNotifications');

    // Fetch all existing scheduled notifications for this league
    const existingNotifications = await scheduledNotificationsCollection
      .find({ leagueId: league._id })
      .toArray();

    const scheduledNotifications: Array<ScheduledNotification> = [];

    const getTimeBefore = (timestamp: number, hours = 12) =>
      timestamp - hours * 60 * 60 * 1000;

    // Helper function to get users who already received a specific notification type for a round
    const getUsersAlreadyNotified = (
      roundId: string,
      type: ScheduledNotification['type'],
    ): Set<string> => {
      return new Set(
        existingNotifications
          .filter((n) => {
            const isCompletedType = n.type === type && n.status === 'completed';
            if (!isCompletedType) {
              return false;
            }
            if ('roundId' in n.data) {
              return n.data.roundId === roundId;
            }
            return false;
          })
          .flatMap((n) => n.userIds),
      );
    };

    (() => {
      const currentRound = league.rounds.current;
      if (!currentRound || currentRound.isPending) {
        return;
      }

      switch (currentRound.stage) {
        case 'completed':
        case 'unknown':
        case 'upcoming': {
          return;
        }
        case 'submission': {
          const unsubmittedUsers = league.users.filter((user) => {
            const hasSubmitted = currentRound.submissions.some(
              (submission) => submission.userId === user._id,
            );
            return !hasSubmitted;
          });
          if (unsubmittedUsers.length === 0) {
            return;
          }

          // Get users who already received this notification
          const usersAlreadyNotified = getUsersAlreadyNotified(
            currentRound._id,
            'SUBMISSION.REMINDER',
          );

          // Filter out users who already received the notification
          const usersToNotify = unsubmittedUsers
            .map((user) => user._id)
            .filter((userId) => !usersAlreadyNotified.has(userId));

          if (usersToNotify.length === 0) {
            return;
          }

          scheduledNotifications.push({
            _id: new ObjectId(),
            type: 'SUBMISSION.REMINDER',
            status: 'pending',
            leagueId: league._id,
            userIds: usersToNotify,
            executeAt: getTimeBefore(currentRound.submissionEndDate),
            data: {
              roundId: currentRound._id,
              notification: {
                code: 'SUBMISSION.REMINDER',
                title: 'Round Submission Reminder',
                message: `Song submissions for ${
                  currentRound.title
                } are ending at ${formatDateWithTime(
                  currentRound.submissionEndDate,
                )}. Make sure to get your submission in on time!`,
              },
            },
          });
          return;
        }
        case 'voting':
        case 'currentUserVotingCompleted': {
          const unvotedUsers = league.users.filter((user) => {
            const hasVoted = currentRound.votes.some(
              (vote) => vote.userId === user._id,
            );
            return !hasVoted;
          });

          if (unvotedUsers.length === 0) {
            return;
          }

          // Get users who already received this notification
          const usersAlreadyNotified = getUsersAlreadyNotified(
            currentRound._id,
            'VOTING.REMINDER',
          );

          // Filter out users who already received the notification
          const usersToNotify = unvotedUsers
            .map((user) => user._id)
            .filter((userId) => !usersAlreadyNotified.has(userId));

          if (usersToNotify.length === 0) {
            return;
          }

          scheduledNotifications.push({
            _id: new ObjectId(),
            type: 'VOTING.REMINDER',
            status: 'pending',
            leagueId: league._id,
            userIds: usersToNotify,
            executeAt: getTimeBefore(currentRound.votingEndDate),
            data: {
              roundId: currentRound._id,
              notification: {
                code: 'VOTING.REMINDER',
                title: 'Round Voting Reminder',
                message: `Voting for ${
                  currentRound.title
                } is ending at ${formatDateWithTime(
                  currentRound.votingEndDate,
                )}. Make sure to get your votes in on time!`,
              },
            },
          });
          return;
        }
      }
    })();

    // Only delete pending notifications - keep completed/failed as historical record
    await scheduledNotificationsCollection.deleteMany({
      leagueId: league._id,
      status: 'pending',
    });

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
    'scheduledNotifications',
  );

  const now = Date.now();

  return await notificationsCollection
    .find({
      status: 'pending',
      executeAt: { $lte: now },
    })
    .sort({ executeAt: 1 })
    .toArray();
}

/**
 * Mark a notification as completed
 */
export async function markNotificationCompleted(
  notificationId: ObjectId,
): Promise<void> {
  const db = await getDatabase();
  const notificationsCollection = db.collection<ScheduledNotification>(
    'scheduledNotifications',
  );

  await notificationsCollection.updateOne(
    { _id: notificationId },
    {
      $set: {
        status: 'completed',
        executedAt: Date.now(),
      },
    },
  );
}

/**
 * Mark a notification as failed
 */
export async function markNotificationFailed(
  notificationId: ObjectId,
  error: string,
): Promise<void> {
  const db = await getDatabase();
  const notificationsCollection = db.collection<ScheduledNotification>(
    'scheduledNotifications',
  );

  await notificationsCollection.updateOne(
    { _id: notificationId },
    {
      $set: {
        status: 'failed',
        executedAt: Date.now(),
        error,
      },
    },
  );
}
