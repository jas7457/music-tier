import Landing from "@/components/Landing";
import Home from "@/components/Home";
import { getUserByCookies, getUserLeagues } from "@/lib/data";
import { verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";

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

  const cookieStore = cookies();
  const accessToken = cookieStore.get("spotify_access_token");
  const refreshToken = cookieStore.get("spotify_refresh_token");
  if (!accessToken && !refreshToken) {
    return <Landing />;
  }

  // Fetch the user's leagues directly from the database
  const leagues = await getUserLeagues(payload.userId);

  return <Home leagues={leagues} user={user} />;
}
