import { getUserByCookies } from "@/lib/data";
import { redirect } from "next/navigation";
import { UserSettingsClient } from "./UserSettingsClient";

export default async function SettingsPage() {
  const user = await getUserByCookies("");

  if (!user) {
    redirect("/");
  }

  return <UserSettingsClient user={user} />;
}
