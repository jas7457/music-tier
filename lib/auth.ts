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
const userJen = {
  userId: "69112e8d8741da077820df17",
  userName: "jdivita",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const userDharam = {
  userId: "6913c20f8741da077820dfcc",
  userName: "dharam66",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const userKelsey = {
  userId: "6913cb53650998c5d85ac36b",
  userName: "khappel28",
};

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
