import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';
import { getPolls, processPollNotifications } from '@/lib/polls';
import { PollsPageClient } from './PollsPageClient';

export const dynamic = 'force-dynamic';

export default async function PollsPage() {
  const payload = await verifySessionToken();
  if (!payload) {
    redirect('/');
  }

  const { polls, now } = await getPolls(payload.userId);

  // Polls close on their own clock; send any results notification that's due
  // without holding up the page.
  after(processPollNotifications);

  return <PollsPageClient polls={polls} now={now} />;
}
