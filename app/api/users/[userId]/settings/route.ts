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
    const { phoneNumber, phoneCarrier, emailAddress, notificationSettings } =
      body;

    const formattedPhoneNumber = phoneNumber
      ? getFormattedPhoneNumber(phoneNumber)
      : null;

    if (phoneNumber && !formattedPhoneNumber) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    if (phoneCarrier && !["verizon", "att", "tmobile"].includes(phoneCarrier)) {
      return NextResponse.json(
        { error: "Invalid phone carrier" },
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
        "VOTING.REMINDER": false,
        "SUBMISSIONS.HALF_SUBMITTED": false,
        "SUBMISSIONS.LAST_TO_SUBMIT": false,
        "SUBMISSION.REMINDER": false,
        "ROUND.REMINDER": false,
        "ROUND.STARTED": false,
        "ROUND.COMPLETED": false,
        "ROUND.HALF_VOTED": false,
        "ROUND.LAST_TO_VOTE": false,
        "LEAGUE.COMPLETED": false,
        textNotificationsEnabled: false,
        emailNotificationsEnabled: false,
      };

    const usersCollection = await getCollection<User>("users");

    // Check if we need to get the current user to compare phone details
    const currentUser = await usersCollection.findOne({
      _id: new ObjectId(payload.userId),
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If phone number or carrier changed, reset verification
    const phoneChanged =
      formattedPhoneNumber !== currentUser.phoneNumber ||
      phoneCarrier !== currentUser.phoneCarrier;

    // Update the user document
    const updateFields: any = {
      phoneNumber: formattedPhoneNumber || undefined,
      phoneCarrier: phoneCarrier || undefined,
      emailAddress: emailAddress || undefined,
      notificationSettings: {
        ...defaultNotificationSettings,
        ...(notificationSettings || {}),
      },
    };

    // Reset verification if phone details changed
    if (phoneChanged) {
      updateFields.phoneVerified = false;
    }

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(payload.userId) },
      {
        $set: updateFields,
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
      phoneCarrier: result.phoneCarrier,
      phoneVerified: result.phoneVerified,
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
