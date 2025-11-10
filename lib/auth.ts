import jwt from "jsonwebtoken";
import { User } from "@/databaseTypes";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

export interface SessionPayload {
  userId: string;
  spotifyId?: string;
  userName: string;
}

export function createSessionToken(user: User): string {
  const payload: SessionPayload = {
    userId: user._id,
    spotifyId: user.spotifyId,
    userName: user.userName,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return {
      ...decoded,
      // userId: "69112e8d8741da077820df17",
      // userName: "jdivita",
    };
  } catch (error) {
    return null;
  }
}
