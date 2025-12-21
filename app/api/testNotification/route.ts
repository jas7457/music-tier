import { NextResponse } from "next/server";
import { sendNotifications } from "@/lib/notifications";
import { getUserLeagues } from "@/lib/data";
import { JASON_ID } from "@/lib/utils/constants";

export async function POST() {
  const leagues = await getUserLeagues(JASON_ID);
  const league = leagues.find(
    (league) => league._id === "6912aff020024991c82b72e1"
  );
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  await sendNotifications(
    [
      {
        code: "NOTIFICATION.FORCE",
        title: "Hi friend!",
        message:
          "Gotcha. No real notification, I just wanted to say hi and have a good day! :)",
        userIds: league.users.map((user) => user._id),
      },
    ],
    league
  );
  return NextResponse.json({ success: true });
}
