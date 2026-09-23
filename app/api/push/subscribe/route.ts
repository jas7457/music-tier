import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import type { User, PushSubscription } from '@/databaseTypes';
import { getVapidPublicKey } from '@/lib/webPush';
import { ObjectId } from 'mongodb';

export async function GET() {
  const payload = await verifySessionToken();
  if (!payload) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID keys not configured' },
      { status: 500 },
    );
  }

  return NextResponse.json({ publicKey });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const subscription: PushSubscription = await request.json();

    if (
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json(
        { error: 'Invalid subscription format' },
        { status: 400 },
      );
    }

    const usersCollection = await getCollection<User>('users');
    const userId = new ObjectId(payload.userId);

    // Store a normalized shape. Saving the raw browser object meant the same
    // endpoint could be stored twice when incidental fields differed (e.g.
    // `expirationTime` present vs absent), which $addToSet treats as distinct.
    const normalized: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    // An endpoint is one browser install, and it belongs to whoever is logged
    // in on it now. Remove it from any other account that had it saved (e.g.
    // a browser used to log into several accounts), otherwise that device
    // gets a copy of every notification for each of those accounts.
    await usersCollection.updateMany(
      {
        _id: { $ne: userId },
        'pushSubscriptions.endpoint': normalized.endpoint,
      },
      { $pull: { pushSubscriptions: { endpoint: normalized.endpoint } } },
    );

    // Replace any existing entry for this endpoint with the latest one (the
    // browser may have rotated its keys), atomically in a single update so
    // concurrent page loads can't leave a duplicate behind.
    await usersCollection.updateOne({ _id: userId }, [
      {
        $set: {
          pushSubscriptions: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ['$pushSubscriptions', []] },
                  cond: { $ne: ['$$this.endpoint', normalized.endpoint] },
                },
              },
              [{ $literal: normalized }],
            ],
          },
        },
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 },
      );
    }

    const usersCollection = await getCollection<User>('users');

    // Remove subscription from user's pushSubscriptions array
    await usersCollection.updateOne(
      { _id: new ObjectId(payload.userId) },
      {
        $pull: {
          pushSubscriptions: { endpoint } as any,
        },
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 },
    );
  }
}
