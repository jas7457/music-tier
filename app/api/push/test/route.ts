import { NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import type { User } from '@/databaseTypes';
import { sendPushToSubscriptions } from '@/lib/webPush';
import { ObjectId } from 'mongodb';
import { APP_NAME, logo } from '@/lib/utils/constants';

export async function POST(request: Request) {
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { delay = 0 } = await request.json().catch(() => ({ delay: 0 }));

    const usersCollection = await getCollection<User>('users');
    const user = await usersCollection.findOne({
      _id: new ObjectId(payload.userId),
    });

    if (
      !user ||
      !user.pushSubscriptions ||
      user.pushSubscriptions.length === 0
    ) {
      return NextResponse.json(
        { error: 'No push subscriptions found' },
        { status: 404 },
      );
    }

    // Wait for the specified delay before sending
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Send test notification to all user's subscriptions (deduped by
    // endpoint; expired ones are pruned)
    const counts = await sendPushToSubscriptions(user.pushSubscriptions, {
      title: `${APP_NAME} Test Notification`,
      body: 'Push notifications are working!',
      icon: logo.src,
      data: {
        link: '/settings',
      },
    });

    return NextResponse.json({
      success: true,
      sent: counts.sent,
      failed: counts.failed,
      expired: counts.expired,
      total: user.pushSubscriptions.length,
    });
  } catch (error) {
    console.error('Error sending test push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 },
    );
  }
}
