import Landing from '@/components/Landing';
import Home from '@/components/Home';
import { getHomeLeagues, getUserByCookies } from '@/lib/data';
import { verifySessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export default async function Page() {
  // Verify the session token
  const payload = await verifySessionToken();

  if (!payload) {
    return <Landing />;
  }

  const user = await getUserByCookies('');
  if (!user) {
    return <Landing />;
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token');
  const refreshToken = cookieStore.get('spotify_refresh_token');
  if (!accessToken && !refreshToken) {
    return <Landing />;
  }

  // Only the current league is populated; the rest are just summaries.
  const { currentLeague, otherLeagues } = await getHomeLeagues(payload.userId);

  return (
    <Home
      currentLeague={currentLeague}
      otherLeagues={otherLeagues}
      user={user}
    />
  );
}
