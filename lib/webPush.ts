import webpush from "web-push";
import type { PushSubscription } from "@/databaseTypes";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:noreply@example.com";

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn(
    "VAPID keys not configured. Web push notifications will not work."
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

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("VAPID keys not configured");
    return false;
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
      JSON.stringify(payload)
    );
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    // If subscription is invalid (410 Gone), we should remove it from the database
    // The caller should handle this
    return false;
  }
}

export function getVapidPublicKey(): string | null {
  return vapidPublicKey || null;
}
