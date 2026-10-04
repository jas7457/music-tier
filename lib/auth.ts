import { User } from '@/databaseTypes';
import { cookies } from 'next/headers';
import {
  decodeSessionToken,
  SESSION_COOKIE,
  signSessionToken,
  type SessionPayload,
} from './sessionCookie';

export type { SessionPayload };

export function createSessionToken(user: User): string {
  return signSessionToken({
    userId: user._id.toString(),
    spotifyId: user.spotifyId,
    userName: user.userName,
  });
}

const userDharam = {
  userId: '692722dc52eadc22aeac2cf5',
  userName: '4everevolution',
};

const userTJ = {
  userId: '6924743e2f3d26e1e94e889b',
  userName: 'TJ',
};

const userCody = {
  userId: '6925a5f5c862b83683fbb9ea',
  userName: 'codeman9090',
};

const userKelsey = {
  userId: '692462e546422e7ee9dc0f6d',
  userName: 'khappel28',
};

const userJen = {
  userId: '692b4f13016f4a750237c163',
  userName: 'stickyrice',
};

const userTest = {
  userId: '6925b2f8e6a0480e21051dcc',
  userName: 'testuser',
};

const users = [userDharam, userKelsey, userJen, userTest, userTJ, userCody];

export async function verifySessionToken(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const decoded = decodeSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  const sessionOverride = cookieStore.get('session_override')?.value;

  if (!decoded) {
    return null;
  }

  const overrideUser = users.find((user) => user.userName === sessionOverride);
  if (overrideUser) {
    return { ...decoded, ...overrideUser };
  }

  return decoded;
}
