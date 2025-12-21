import { sendEmail, sendTextEmail } from "./emailService";
import { triggerNotifications } from "./pusher-server";
import { PopulatedLeague, PopulatedRound, PopulatedUser } from "./types";
import { APP_NAME, PRODUCTION_URL, logo } from "./utils/constants";
import { getAllRounds } from "./utils/getAllRounds";
import { sendPushNotification } from "./webPush";
import { getCollection } from "./mongodb";
import type { User } from "@/databaseTypes";
import { ObjectId } from "mongodb";

export type Notification =
  | {
      code: "NOTIFICATION.FORCE";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "VOTING.STARTED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "VOTING.REMINDER";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "SUBMISSION.REMINDER";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "SUBMISSIONS.HALF_SUBMITTED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "SUBMISSIONS.LAST_TO_SUBMIT";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "ROUND.REMINDER";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "ROUND.STARTED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "ROUND.COMPLETED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "ROUND.HALF_VOTED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "ROUND.LAST_TO_VOTE";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    }
  | {
      code: "LEAGUE.COMPLETED";
      userIds: string[];
      title: string;
      message: string;
      additionalHTML?: string;
      link?: string;
    };

export async function roundNotifications({
  isNewRound,
  round,
  before,
  after,
}: {
  isNewRound: boolean;
  round: Pick<PopulatedRound, "_id" | "isBonusRound">;
  before: { league: PopulatedLeague };
  after: { league: PopulatedLeague };
}) {
  const notifications: Notification[] = [];
  const leagueLink = `${PRODUCTION_URL}/leagues/${before.league._id}`;
  const roundLink = `${leagueLink}/rounds/${round._id}`;

  const league = after.league;
  const foundRound =
    getAllRounds(league, { includeFake: true, includePending: true }).find(
      (r) => r._id === round._id
    ) ?? null;

  const beforeRound = getAllRounds(before.league, {
    includePending: true,
    includeFake: true,
  }).find((currentRound) => {
    if (isNewRound) {
      if (currentRound._id) {
        return false;
      }
      if (round.isBonusRound) {
        return currentRound.isBonusRound;
      } else {
        return !currentRound.isBonusRound;
      }
    }

    return currentRound._id === round._id;
  });

  if (!league || !foundRound || !beforeRound) {
    return;
  }

  if (
    foundRound.stage === "submission" &&
    (beforeRound.stage === "upcoming" ||
      (beforeRound.stage === "submission" && beforeRound.isPending))
  ) {
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
  before,
  after,
}: {
  league: PopulatedLeague;
  before: { round: PopulatedRound };
  after: { round: PopulatedRound | undefined };
}) {
  const afterRound = after.round;
  if (!afterRound) {
    return;
  }
  const notifications: Notification[] = [];

  const { submittedUsers, unsubmittedUsers } = league.users.reduce(
    (acc, user) => {
      const userHasSubmitted = afterRound.submissions.some(
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
  before,
  after,
}: {
  before: { league: PopulatedLeague; round: PopulatedRound };
  after: {
    league: PopulatedLeague | undefined;
    round: PopulatedRound | undefined;
  };
}) {
  const { round: afterRound, league: afterLeague } = after;
  if (!afterRound || !afterLeague) {
    return;
  }
  const notifications: Notification[] = [];

  const { unvotedUsers, votedUsers } = afterLeague.users.reduce(
    (acc, user) => {
      const userHasVoted = afterRound.votes.some(
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

  const halfOfUsers = afterLeague.users.length / 2;

  (() => {
    const leagueLink = `${PRODUCTION_URL}/leagues/${afterLeague._id}`;
    const roundLink = `${leagueLink}/rounds/${afterRound._id}`;

    if (unvotedUsers.length === 0) {
      if (
        afterLeague.status === "completed" &&
        before.league.status !== "completed"
      ) {
        notifications.push({
          code: "LEAGUE.COMPLETED",
          userIds: afterLeague.users.map((user) => user._id),
          title: "League completed",
          message: `The league "${afterLeague.title}" has been completed. Check out the final results!`,
          additionalHTML: `<p><a href="${leagueLink}">Click here to go to the league and view the final results.</a></p>`,
          link: leagueLink,
        });
      } else {
        notifications.push({
          code: "ROUND.COMPLETED",
          userIds: afterLeague.users.map((user) => user._id),
          title: "Round completed",
          message: `All votes are in for ${afterRound.title}. Check out the results!`,
          additionalHTML: `<p><a href="${roundLink}">Click here to go to the round and view the results.</a></p>`,
          link: roundLink,
        });

        const next3Rounds = [
          afterLeague.rounds.current,
          ...afterLeague.rounds.upcoming,
        ]
          .filter((round) => round !== undefined)
          .slice(0, 3)
          .filter((round) => round.isPending);

        for (const round of next3Rounds) {
          notifications.push({
            code: "ROUND.REMINDER",
            userIds: [round.creatorId],
            title: "Round reminder",
            message:
              "You still have to submit your round, and it's coming up soon!",
            additionalHTML: `<p><a href="${PRODUCTION_URL}/leagues/${afterLeague._id}">Click here to add your round.</a></p>`,
            link: `${PRODUCTION_URL}/leagues/${afterLeague._id}`,
          });
        }
      }

      return;
    }

    const beforeUsersVotes = new Set(
      before.round.votes.map((vote) => vote.userId)
    );

    if (unvotedUsers.length === 1) {
      notifications.push({
        code: "ROUND.LAST_TO_VOTE",
        userIds: [unvotedUsers[0]._id],
        title: "Last to vote",
        message: `You are the last to vote for ${afterRound.title}.`,
        additionalHTML: `<p><a href="${roundLink}">Click here to go to the round and cast your vote.</a></p>`,
        link: roundLink,
      });
      return;
    }

    if (
      beforeUsersVotes.size < halfOfUsers &&
      votedUsers.length >= halfOfUsers
    ) {
      notifications.push({
        code: "ROUND.HALF_VOTED",
        userIds: unvotedUsers.map((user) => user._id),
        title: "Half of users have voted",
        message: `Half of the users have voted for ${afterRound.title}. Don't forget to cast your vote!`,
        additionalHTML: `<p><a href="${roundLink}">Click here to go to the round and cast your vote.</a></p>`,
        link: roundLink,
      });
      return;
    }
  })();

  await sendNotifications(notifications, afterLeague);
}

export async function sendNotifications(
  notifications: Notification[],
  league: PopulatedLeague
) {
  if (notifications.length === 0) {
    return;
  }
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
        if (!preferences) {
          return;
        }
        if (
          notification.code !== "NOTIFICATION.FORCE" &&
          !preferences[notification.code]
        ) {
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
            html: `<p>${notification.message}</p>${
              notification.additionalHTML || ""
            }`,
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
