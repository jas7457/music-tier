import { sendEmail, sendTextEmail } from "./emailService";
import { triggerNotifications } from "./pusher-server";
import {
  PopulatedLeague,
  PopulatedRound,
  PopulatedSubmission,
  PopulatedUser,
  PopulatedVote,
} from "./types";
import { APP_NAME, PRODUCTION_URL, logo } from "./utils/constants";
import { getAllRounds } from "./utils/getAllRounds";
import { sendPushNotification } from "./webPush";
import { getCollection } from "./mongodb";
import type { User } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { getUserLeagues } from "./data";

export type Notification =
  | {
      code: "VOTING.STARTED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML: string;
      link: string;
    }
  | {
      code: "SUBMISSIONS.HALF_SUBMITTED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML: string;
      link: string;
    }
  | {
      code: "SUBMISSIONS.LAST_TO_SUBMIT";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML: string;
      link: string;
    }
  | {
      code: "ROUND.STARTED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML: string;
      link: string;
    }
  | {
      code: "ROUND.COMPLETED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML: string;
      link: string;
    }
  | {
      code: "ROUND.HALF_VOTED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML: string;
      link: string;
    }
  | {
      code: "ROUND.LAST_TO_VOTE";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML: string;
      link: string;
    }
  | {
      code: "LEAGUE.COMPLETED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML: string;
      link: string;
    };

export async function roundNotifications({
  userId,
  round,
  before,
}: {
  userId: string;
  round: Pick<PopulatedRound, "_id">;
  before: { round: PopulatedRound; league: PopulatedLeague };
}) {
  const notifications: Notification[] = [];
  const leagueLink = `${PRODUCTION_URL}/leagues/${before.league._id}`;
  const roundLink = `${leagueLink}/rounds/${round._id}`;

  const userLeagues = await getUserLeagues(userId);

  const { league, foundRound } = (() => {
    for (const league of userLeagues) {
      if (league._id === before.league._id) {
        const allRounds = getAllRounds(league, {
          includeFake: true,
          includePending: true,
        });

        const foundRound = allRounds.find((r) => r._id === round._id) ?? null;
        return { league, foundRound };
      }
    }
    return { league: null, foundRound: null };
  })();

  if (!league || !foundRound) {
    return;
  }

  if (foundRound.stage === "submission" && before.round.stage === "upcoming") {
    notifications.push({
      code: "ROUND.STARTED",
      userIds: league.users.map((user) => user._id),
      title: "Round started",
      message: `The round "${foundRound.title}" has started! Get ready to submit your songs.`,
      additionalHTML: `<p><a href="${roundLink}">Click here to go to the round and view details.</a></p>`,
      link: roundLink,
    });
  }

  await sendNotifications(notifications, league);
}

export async function submissionNotifications({
  league,
  submission,
  before,
}: {
  league: PopulatedLeague;
  submission: Pick<PopulatedSubmission, "userId">;
  before: { round: PopulatedRound };
}) {
  const notifications: Notification[] = [];

  const { submittedUsers, unsubmittedUsers } = league.users.reduce(
    (acc, user) => {
      const userHasSubmitted = [...before.round.submissions, submission].some(
        (submission) => submission.userId === user._id
      );
      if (userHasSubmitted) {
        acc.submittedUsers.push(user);
      } else {
        acc.unsubmittedUsers.push(user);
      }
      return acc;
    },
    {
      submittedUsers: [] as PopulatedUser[],
      unsubmittedUsers: [] as PopulatedUser[],
    }
  );

  const halfOfUsers = league.users.length / 2;

  (() => {
    const leagueLink = `${PRODUCTION_URL}/leagues/${league._id}`;
    const roundLink = `${leagueLink}/rounds/${before.round._id}`;
    if (unsubmittedUsers.length === 0) {
      notifications.push({
        code: "VOTING.STARTED",
        userIds: league.users.map((user) => user._id),
        title: "Voting has started",
        message: `All submissions are in. It's time to vote on ${before.round.title}!`,
        additionalHTML: `<p><a href="${roundLink}">Click here to go to the round and cast your vote.</a></p>`,
        link: roundLink,
      });
      return;
    }

    if (unsubmittedUsers.length === 1) {
      notifications.push({
        code: "SUBMISSIONS.LAST_TO_SUBMIT",
        userIds: [unsubmittedUsers[0]._id],
        title: "Last to submit",
        message: `You are the last to submit your song for ${before.round.title}.`,
        additionalHTML: `<p><a href="${roundLink}">Click here to go to the round and submit your song.</a></p>`,
        link: roundLink,
      });
      return;
    }

    if (
      before.round.submissions.length < halfOfUsers &&
      submittedUsers.length >= halfOfUsers
    ) {
      notifications.push({
        code: "SUBMISSIONS.HALF_SUBMITTED",
        userIds: unsubmittedUsers.map((user) => user._id),
        title: "Half of users have submitted",
        message: `Half of the users have submitted their songs for ${before.round.title}. Don't forget to submit yours!`,
        additionalHTML: `<p><a href="${roundLink}">Click here to go to the round and submit your song.</a></p>`,
        link: roundLink,
      });
      return;
    }
  })();

  await sendNotifications(notifications, league);
}

export async function voteNotifications({
  league,
  votes,
  before,
}: {
  league: PopulatedLeague;
  votes: Array<Pick<PopulatedVote, "userId">>;
  before: { round: PopulatedRound };
}) {
  const notifications: Notification[] = [];

  const { votedUsers, unvotedUsers } = league.users.reduce(
    (acc, user) => {
      const userHasVoted = [...before.round.votes, ...votes].some(
        (vote) => vote.userId === user._id
      );
      if (userHasVoted) {
        acc.votedUsers.push(user);
      } else {
        acc.unvotedUsers.push(user);
      }
      return acc;
    },
    {
      votedUsers: [] as PopulatedUser[],
      unvotedUsers: [] as PopulatedUser[],
    }
  );

  const halfOfUsers = league.users.length / 2;

  (() => {
    const leagueLink = `${PRODUCTION_URL}/leagues/${league._id}`;
    const roundLink = `${leagueLink}/rounds/${before.round._id}`;

    if (unvotedUsers.length === 0) {
      const isLeagueCompleted = getAllRounds(league, {
        includePending: true,
        includeFake: true,
      }).every((round) => {
        if (round._id === before.round._id) {
          return true;
        }
        return round.stage === "completed";
      });

      if (isLeagueCompleted) {
        notifications.push({
          code: "LEAGUE.COMPLETED",
          userIds: league.users.map((user) => user._id),
          title: "League completed",
          message: `The league "${league.title}" has been completed. Check out the final results!`,
          additionalHTML: `<p><a href="${leagueLink}">Click here to go to the league and view the final results.</a></p>`,
          link: leagueLink,
        });
      } else {
        notifications.push({
          code: "ROUND.COMPLETED",
          userIds: league.users.map((user) => user._id),
          title: "Round completed",
          message: `All votes are in for ${before.round.title}. Check out the results!`,
          additionalHTML: `<p><a href="${roundLink}">Click here to go to the round and view the results.</a></p>`,
          link: roundLink,
        });
      }

      return;
    }

    if (unvotedUsers.length === 1) {
      notifications.push({
        code: "ROUND.LAST_TO_VOTE",
        userIds: [unvotedUsers[0]._id],
        title: "Last to vote",
        message: `You are the last to vote for ${before.round.title}.`,
        additionalHTML: `<p><a href="${roundLink}">Click here to go to the round and cast your vote.</a></p>`,
        link: roundLink,
      });
      return;
    }

    if (
      before.round.votes.length < halfOfUsers &&
      votedUsers.length >= halfOfUsers
    ) {
      notifications.push({
        code: "ROUND.HALF_VOTED",
        userIds: unvotedUsers.map((user) => user._id),
        title: "Half of users have voted",
        message: `Half of the users have voted for ${before.round.title}. Don't forget to cast your vote!`,
        additionalHTML: `<p><a href="${roundLink}">Click here to go to the round and cast your vote.</a></p>`,
        link: roundLink,
      });
      return;
    }
  })();

  await sendNotifications(notifications, league);
}

async function sendNotifications(
  notifications: Notification[],
  league: PopulatedLeague
) {
  try {
    triggerNotifications(notifications);

    const usersById = league.users.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {} as Record<string, PopulatedUser>);

    // Collect all user IDs that need notifications
    const userIdsNeedingNotifications = new Set<string>();
    notifications.forEach((notification) => {
      notification.userIds.forEach((userId) => {
        userIdsNeedingNotifications.add(userId);
      });
    });

    // Fetch full user data with push subscriptions from database
    const usersCollection = await getCollection<User>("users");
    const usersWithPushData = await usersCollection
      .find({
        _id: {
          $in: Array.from(userIdsNeedingNotifications).map(
            (id) => new ObjectId(id)
          ),
        },
      })
      .toArray();

    const usersWithPushById = usersWithPushData.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {} as Record<string, User>);

    // Send all notifications
    const notificationPromises: Promise<void>[] = [];

    notifications.forEach((notification) => {
      notification.userIds.forEach((userId) => {
        const user = usersById[userId];
        const userWithPush = usersWithPushById[userId];
        if (!user) {
          return;
        }

        const preferences = user.notificationSettings;
        if (!preferences || !preferences[notification.code]) {
          return;
        }

        // Send push notifications via VAPID
        if (
          userWithPush?.pushSubscriptions &&
          userWithPush.pushSubscriptions.length > 0
        ) {
          userWithPush.pushSubscriptions.forEach((subscription) => {
            const pushPromise = sendPushNotification(subscription, {
              title: notification.title,
              body: notification.message,
              icon: logo.src,
              data: {
                link: notification.link,
                code: notification.code,
              },
            }).catch((error) => {
              console.error(
                "[Notifications] Error sending push notification:",
                error
              );
            });
            notificationPromises.push(pushPromise as Promise<void>);
          });
        }

        if (user.emailAddress && preferences.emailNotificationsEnabled) {
          sendEmail({
            to: {
              fullName: `${user.firstName} ${user.lastName}`,
              email: user.emailAddress,
            },
            subject: `${APP_NAME} Update: ${notification.title}`,
            html: `<p>${notification.message}</p>${notification.additionalHTML}`,
          });
        }

        if (
          user.phoneNumber &&
          preferences.textNotificationsEnabled &&
          user.phoneCarrier &&
          user.phoneVerified
        ) {
          sendTextEmail({
            number: user.phoneNumber,
            message: `${APP_NAME} Update: ${notification.title} - ${notification.message}`,
            phoneCarrier: user.phoneCarrier,
          });
        }
      });
    });

    // Wait for all push notifications to be sent
    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("[Notifications] Error sending notifications", error);
  }
}
