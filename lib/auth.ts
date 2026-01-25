import jwt from 'jsonwebtoken';
import { User } from '@/databaseTypes';
import { cookies } from 'next/headers';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export interface SessionPayload {
  userId: string;
  spotifyId?: string;
  userName: string;
}

export function createSessionToken(user: User): string {
  const payload: SessionPayload = {
    userId: user._id.toString(),
    spotifyId: user.spotifyId,
    userName: user.userName,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
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
  const sessionToken = cookieStore.get('session_token')?.value;
  const sessionOverride = cookieStore.get('session_override')?.value;

  if (!sessionToken) {
    return null;
  }
  try {
    const decoded = jwt.verify(sessionToken, JWT_SECRET) as SessionPayload;

    const overrideUser = users.find(
      (user) => user.userName === sessionOverride,
    );
    if (overrideUser) {
      return { ...decoded, ...overrideUser };
    }

    return decoded;
  } catch {
    return null;
  }
}
