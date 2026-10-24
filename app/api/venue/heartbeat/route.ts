import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import type { User } from '@/databaseTypes';
import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';

/**
 * Marks the signed-in user as active right now. The venue pings this while
 * it's open, and once more (via sendBeacon) as it closes, so "last active"
 * tracks roughly when someone left the venue rather than when they arrived.
 *
 * Returns 204 no matter what: a missed heartbeat should never surface to the
 * user.
 */
export async function POST() {
  try {
    const session = await verifySessionToken();
    if (session) {
      const users = await getCollection<User>('users');
      await users.updateOne(
        { _id: new ObjectId(session.userId) },
        { $set: { lastActive: Date.now() } },
      );
    }
  } catch {
    // swallow: presence heartbeats are best-effort
  }
  return new NextResponse(null, { status: 204 });
}
