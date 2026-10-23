import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import type { League, User } from '@/databaseTypes';
import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { canUsePusher, getPusherServer } from '@/lib/pusher-server';
import { parseVenueChannel, type VenueMemberInfo } from '@/lib/venuePresence';

/**
 * Lets pusher-js join a league's venue presence channel (who's online, live
 * movement, emotes). Only signed-in members of that league get in, and the
 * member id / name come from the session, never from the browser, so nobody
 * can show up as someone else.
 */
export async function POST(request: NextRequest) {
  if (!canUsePusher()) {
    return NextResponse.json({ error: 'Live features are off' }, { status: 403 });
  }

  const session = await verifySessionToken();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const form = await request.formData();
  const socketId = form.get('socket_id');
  const channel = form.get('channel_name');
  if (typeof socketId !== 'string' || typeof channel !== 'string') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const leagueId = parseVenueChannel(channel);
  if (!leagueId) {
    return NextResponse.json({ error: 'Unknown channel' }, { status: 403 });
  }

  const [leagues, users] = await Promise.all([
    getCollection<League>('leagues'),
    getCollection<User>('users'),
  ]);
  const [league, user] = await Promise.all([
    leagues.findOne({ _id: new ObjectId(leagueId), users: session.userId }),
    users.findOne({ _id: new ObjectId(session.userId) }),
  ]);
  if (!league || !user) {
    return NextResponse.json({ error: 'Not in this league' }, { status: 403 });
  }

  const userInfo: VenueMemberInfo = {
    userName: user.userName,
    photoUrl: user.photoUrl,
  };
  const auth = getPusherServer().authorizeChannel(socketId, channel, {
    user_id: session.userId,
    user_info: userInfo,
  });
  return NextResponse.json(auth);
}
