import webpush from 'web-push';
import type { PushSubscription, User } from '@/databaseTypes';
import { getCollection } from './mongodb';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@example.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn(
    'VAPID keys not configured. Web push notifications will not work.',
  );
} else {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export type PushNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  data?: {
    link?: string;
    code?: string;
  };
};

export type PushSendResult = 'sent' | 'expired' | 'failed';

/**
 * Sends a single push. Returns 'expired' only when the push service
 * authoritatively reports the subscription no longer exists (404 / 410 Gone) —
 * the only case where it is safe to delete it. Every other error (network,
 * 5xx, 429, or a 400/403 that likely points at our own VAPID config) is
 * 'failed' and leaves the subscription alone.
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload,
): Promise<PushSendResult> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID keys not configured');
    return 'failed';
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(payload),
    );
    return 'sent';
  } catch (error) {
    const statusCode =
      error instanceof webpush.WebPushError ? error.statusCode : undefined;
    if (statusCode === 404 || statusCode === 410) {
      return 'expired';
    }
    console.error('Error sending push notification:', error);
    return 'failed';
  }
}

/**
 * Collapses subscriptions that share an endpoint (one endpoint = one browser
 * install). The last occurrence wins: subscriptions are appended as they're
 * saved, so the last one carries the browser's most recent encryption keys.
 * Pushes encrypted with stale keys can't be decrypted by the device.
 */
export function dedupeSubscriptions(
  subscriptions: PushSubscription[],
): PushSubscription[] {
  const byEndpoint = new Map<string, PushSubscription>();
  for (const subscription of subscriptions) {
    // Re-insert so iteration order reflects the latest occurrence.
    byEndpoint.delete(subscription.endpoint);
    byEndpoint.set(subscription.endpoint, subscription);
  }
  return Array.from(byEndpoint.values());
}

/**
 * Removes subscriptions the push service reported as gone, from every user
 * that has them saved.
 */
export async function removeExpiredSubscriptions(
  endpoints: string[],
): Promise<void> {
  if (endpoints.length === 0) {
    return;
  }
  try {
    const usersCollection = await getCollection<User>('users');
    await usersCollection.updateMany(
      { 'pushSubscriptions.endpoint': { $in: endpoints } },
      { $pull: { pushSubscriptions: { endpoint: { $in: endpoints } } } },
    );
    console.log(`[Push] Removed ${endpoints.length} expired subscription(s)`);
  } catch (error) {
    console.error('[Push] Error removing expired subscriptions:', error);
  }
}

/**
 * Sends one push per unique endpoint and prunes any that have expired.
 */
export async function sendPushToSubscriptions(
  subscriptions: PushSubscription[],
  payload: PushNotificationPayload,
): Promise<Record<PushSendResult, number>> {
  const unique = dedupeSubscriptions(subscriptions);
  const results = await Promise.all(
    unique.map((subscription) =>
      sendPushNotification(subscription, payload).then((result) => ({
        endpoint: subscription.endpoint,
        result,
      })),
    ),
  );

  await removeExpiredSubscriptions(
    results.filter((r) => r.result === 'expired').map((r) => r.endpoint),
  );

  return results.reduce(
    (counts, { result }) => {
      counts[result] += 1;
      return counts;
    },
    { sent: 0, expired: 0, failed: 0 },
  );
}

export function getVapidPublicKey(): string | null {
  return vapidPublicKey || null;
}
