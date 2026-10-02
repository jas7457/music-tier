import type { User } from '@/databaseTypes';

export type NotificationSettings = NonNullable<User['notificationSettings']>;

/**
 * Defaults for every notification preference. Stored settings are always
 * layered on top of these, so a newly added notification type takes its
 * default here until the user explicitly changes it.
 *
 * Most types are opt-in (false). Polls are opt-out (true): everyone hears
 * about new polls and their results unless they turn it off.
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  'NOTIFICATION.FORCE': true,
  'VOTING.STARTED': false,
  'VOTING.REMINDER': false,
  'SUBMISSION.REMINDER': false,
  'SUBMISSIONS.HALF_SUBMITTED': false,
  'SUBMISSIONS.LAST_TO_SUBMIT': false,
  'ROUND.REMINDER': false,
  'ROUND.STARTED': false,
  'ROUND.COMPLETED': false,
  'ROUND.HALF_VOTED': false,
  'ROUND.LAST_TO_VOTE': false,
  'LEAGUE.COMPLETED': false,
  'POLL.STARTED': true,
  'POLL.COMPLETED': true,
  textNotificationsEnabled: false,
  emailNotificationsEnabled: false,
};

export function getNotificationSettings(
  user: Pick<User, 'notificationSettings'>,
): NotificationSettings {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...user.notificationSettings,
  };
}
