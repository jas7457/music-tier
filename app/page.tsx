import Landing from "@/components/Landing";
import Home from "@/components/Home";
import { getUserByCookies, getUserLeagues } from "@/lib/data";
import { verifySessionToken } from "@/lib/auth";

export default async function Page() {
  // Verify the session token
  const payload = verifySessionToken();

  if (!payload) {
    return <Landing />;
  }

  const user = await getUserByCookies("");
  if (!user) {
    return <Landing />;
  }

  // Fetch the user's leagues directly from the database
  const leagues = await getUserLeagues(payload.userId);

  return <Home leagues={leagues} user={user} />;
}
