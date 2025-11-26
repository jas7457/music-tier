import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import type { User, PushSubscription } from "@/databaseTypes";
import { getVapidPublicKey } from "@/lib/webPush";
import { ObjectId } from "mongodb";

export async function GET() {
  const payload = verifySessionToken();
  if (!payload) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID keys not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey });
}

export async function POST(request: NextRequest) {
  try {
    const payload = verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const subscription: PushSubscription = await request.json();

    if (
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Invalid subscription format" },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection<User>("users");

    // Add subscription to user's pushSubscriptions array if it doesn't exist
    await usersCollection.updateOne(
      { _id: new ObjectId(payload.userId) },
      {
        $addToSet: {
          pushSubscriptions: subscription,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection<User>("users");

    // Remove subscription from user's pushSubscriptions array
    await usersCollection.updateOne(
      { _id: new ObjectId(payload.userId) },
      {
        $pull: {
          pushSubscriptions: { endpoint } as any,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
