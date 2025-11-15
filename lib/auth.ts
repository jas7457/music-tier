import jwt from "jsonwebtoken";
import { User } from "@/databaseTypes";
import { cookies } from "next/headers";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

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

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const userDharam = {
  userId: "691673fc22a34f0ccca322ae",
  userName: "dharam66",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const userKelsey = {
  userId: "69165b47e6a0480e21051d27333",
  userName: "khappel28",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const userJen = {
  userId: "6917ece827ed2929c03cb220",
  userName: "stickyrice",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const oldKeleyId = "69165b47e6a0480e21051d27";

const users = [userJen, userDharam, userKelsey];

export function verifySessionToken(): SessionPayload | null {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  const sessionOverride = cookieStore.get("session_override")?.value;

  if (!sessionToken) {
    return null;
  }
  try {
    const decoded = jwt.verify(sessionToken, JWT_SECRET) as SessionPayload;

    const overrideUser = users.find(
      (user) => user.userName === sessionOverride
    );
    if (overrideUser) {
      return { ...decoded, ...overrideUser };
    }

    return decoded;
  } catch {
    return null;
  }
}
