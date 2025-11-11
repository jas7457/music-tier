import { cookies } from "next/headers";
import Landing from "@/components/Landing";
import Home from "@/components/Home";
import { getUser, getUserLeagues } from "@/lib/data";
import { verifySessionToken } from "@/lib/auth";

export default async function Page() {
  // Get cookies from the server
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  // If no session token, show landing page
  if (!sessionToken) {
    return <Landing />;
  }

  // Verify the session token
  const payload = verifySessionToken(sessionToken);

  if (!payload) {
    return <Landing />;
  }

  const user = await getUser(payload.userId);
  if (!user) {
    return <Landing />;
  }

  // Fetch the user's leagues directly from the database
  const leagues = await getUserLeagues(payload.userId);

  return <Home leagues={leagues} />;
}
