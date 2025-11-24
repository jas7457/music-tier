import { sendEmail } from "./emailService";
import { triggerNotifications } from "./pusher-server";
import {
  PopulatedLeague,
  PopulatedRound,
  PopulatedSubmission,
  PopulatedUser,
  PopulatedVote,
} from "./types";
import { APP_NAME } from "./utils/constants";
import { getAllRounds } from "./utils/getAllRounds";

export type Notification =
  | {
      code: "VOTING.STARTED";
      userIds: string[];
      title: string;
      message: string;
    }
  | {
      code: "SUBMISSIONS.HALF_SUBMITTED";
      userIds: string[];
      title: string;
      message: string;
    }
  | {
      code: "SUBMISSIONS.LAST_TO_SUBMIT";
      userIds: string[];
      title: string;
      message: string;
    }
  | {
      code: "ROUND.COMPLETED";
      userIds: string[];
      title: string;
      message: string;
    }
  | {
      code: "ROUND.HALF_VOTED";
      userIds: string[];
      title: string;
      message: string;
    }
  | {
      code: "ROUND.LAST_TO_VOTE";
      userIds: string[];
      title: string;
      message: string;
    }
  | {
      code: "LEAGUE.COMPLETED";
      userIds: string[];
      title: string;
      message: string;
    };

export function submissionNotifications({
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
    if (unsubmittedUsers.length === 0) {
      notifications.push({
        code: "VOTING.STARTED",
        userIds: league.users.map((user) => user._id),
        title: "Voting has started",
        message: `All submissions are in. It's time to vote on ${before.round.title}!`,
      });
      return;
    }

    if (unsubmittedUsers.length === 1) {
      notifications.push({
        code: "SUBMISSIONS.LAST_TO_SUBMIT",
        userIds: [unsubmittedUsers[0]._id],
        title: "Last to submit",
        message: `You are the last to submit your song for ${before.round.title}.`,
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
      });
      return;
    }
  })();

  sendNotifications(notifications, league);
}

export function voteNotifications({
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
        });
      } else {
        notifications.push({
          code: "ROUND.COMPLETED",
          userIds: league.users.map((user) => user._id),
          title: "Round completed",
          message: `All votes are in for ${before.round.title}. Check out the results!`,
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
      });
      return;
    }
  })();

  sendNotifications(notifications, league);
}

function sendNotifications(
  notifications: Notification[],
  league: PopulatedLeague
) {
  triggerNotifications(notifications);

  const usersById = league.users.reduce((acc, user) => {
    acc[user._id] = user;
    return acc;
  }, {} as Record<string, PopulatedUser>);

  notifications.forEach((notification) => {
    notification.userIds.forEach((userId) => {
      const user = usersById[userId];
      if (!user) {
        return;
      }

      if (
        !user.emailAddress ||
        !user.notificationSettings?.emailNotificationsEnabled
      ) {
        return;
      }

      const preferences = user.notificationSettings;
      if (!preferences[notification.code]) {
        return;
      }

      sendEmail({
        to: {
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.emailAddress,
        },
        subject: `${APP_NAME} Update: ${notification.title}`,
        text: notification.message,
      });
    });
  });
}
