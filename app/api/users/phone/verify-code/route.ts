import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { User } from "@/databaseTypes";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const payload = verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, phoneNumber, phoneCarrier } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    if (!phoneCarrier) {
      return NextResponse.json(
        { error: "Phone carrier is required" },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection<User>("users");
    const user = await usersCollection.findOne({
      _id: new ObjectId(payload.userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.phoneVerificationCode) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new code." },
        { status: 400 }
      );
    }

    if (user.phoneVerificationCode !== code) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Mark phone as verified and clear the verification code
    await usersCollection.updateOne(
      { _id: new ObjectId(payload.userId) },
      {
        $set: {
          phoneVerified: true,
          phoneNumber,
          phoneCarrier,
        },
        $unset: {
          phoneVerificationCode: "",
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying code:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
