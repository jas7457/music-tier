import Pusher from 'pusher';
import {
  PUSHER_APP_ID,
  PUSHER_REAL_TIME_UPDATES,
  PUSHER_CLUSTER,
  PUSHER_PUBLIC_KEY,
  PUSHER_SECRET_KEY,
  PUSHER_NOTIFICATIONS,
} from './utils/constants';

import type { Notification } from './notifications';
import { isSandbox } from '@/lib/sandbox';

let pusherInstance: Pusher | null = null;

function getPusherServer() {
  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_PUBLIC_KEY,
      secret: PUSHER_SECRET_KEY,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    });
  }

  return pusherInstance;
}

// Helper function to trigger events
export async function triggerRealTimeUpdate({
  userIds,
}: { userIds?: string[] } = {}) {
  // Sandbox mode must never publish to the real (shared) Pusher channels.
  if (isSandbox()) {
    return;
  }
  const pusher = getPusherServer();
  await pusher.trigger(PUSHER_REAL_TIME_UPDATES, 'update', { userIds });
}

export async function triggerNotifications(notifications: Notification[]) {
  if (notifications.length === 0 || isSandbox()) {
    return;
  }
  const pusher = getPusherServer();
  await pusher.trigger(PUSHER_NOTIFICATIONS, 'notification', { notifications });
}
