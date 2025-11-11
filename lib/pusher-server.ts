import Pusher from "pusher";
import {
  PUSHER_APP_ID,
  PUSHER_CHANNEL_NAME,
  PUSHER_CLUSTER,
  PUSHER_PUBLIC_KEY,
  PUSHER_SECRET_KEY,
} from "./utils/constants";

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
export async function triggerRealTimeUpdate() {
  const pusher = getPusherServer();
  await pusher.trigger(PUSHER_CHANNEL_NAME, "update", {});
}
