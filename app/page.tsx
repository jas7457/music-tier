import Landing from '@/components/Landing';
import Home from '@/components/Home';
import { Venue } from '@/components/venue/Venue';
import { getHomeLeagues, getUserByCookies } from '@/lib/data';
import { getPolls } from '@/lib/polls';
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
  const [{ currentLeague, otherLeagues }, { polls }] = await Promise.all([
    getHomeLeagues(payload.userId),
    getPolls(payload.userId),
  ]);

  if (currentLeague) {
    const me =
      currentLeague.users.find((member) => member._id === user._id) ?? user;
    return (
      <Venue
        league={currentLeague}
        user={me}
        otherLeagues={otherLeagues}
        polls={polls}
      />
    );
  }

  return (
    <Home
      currentLeague={currentLeague}
      otherLeagues={otherLeagues}
      user={user}
    />
  );
}
