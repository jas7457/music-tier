import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { User } from "@/databaseTypes";
import { ObjectId } from "mongodb";
import { getFormattedPhoneNumber } from "@/lib/utils/phone";

export async function PUT(request: NextRequest) {
  try {
    const payload = verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.userId;

    // Users can only update their own settings
    if (payload.userId !== userId) {
      return NextResponse.json(
        { error: "You can only update your own settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { phoneNumber, emailAddress, notificationSettings } = body;

    const formattedPhoneNumber = phoneNumber
      ? getFormattedPhoneNumber(phoneNumber)
      : null;

    if (phoneNumber && !formattedPhoneNumber) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    if (emailAddress) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailAddress)) {
        return NextResponse.json(
          { error: "Invalid email address format" },
          { status: 400 }
        );
      }
    }

    const defaultNotificationSettings: Required<User["notificationSettings"]> =
      {
        "VOTING.STARTED": false,
        "SUBMISSIONS.HALF_SUBMITTED": false,
        "SUBMISSIONS.LAST_TO_SUBMIT": false,
        "ROUND.COMPLETED": false,
        "ROUND.HALF_VOTED": false,
        "ROUND.LAST_TO_VOTE": false,
        "LEAGUE.COMPLETED": false,
        textNotificationsEnabled: false,
        emailNotificationsEnabled: false,
      };

    const usersCollection = await getCollection<User>("users");

    // Update the user document
    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(payload.userId) },
      {
        $set: {
          phoneNumber: formattedPhoneNumber || undefined,
          emailAddress: emailAddress || undefined,
          notificationSettings: {
            ...defaultNotificationSettings,
            ...(notificationSettings || {}),
          },
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      notificationSettings: result.notificationSettings,
      phoneNumber: result.phoneNumber,
      emailAddress: result.emailAddress,
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
