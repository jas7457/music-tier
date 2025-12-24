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
        title: "Merry Christmas! 🎄",
        message:
          "It's me, Mariah Carey! I've taken over PP for the next 32 hours. Enjoy some festive tunes and happy holidays!",
        userIds: league.users.map((user) => user._id),
      },
    ],
    league
  );
  return NextResponse.json({ success: true });
}
