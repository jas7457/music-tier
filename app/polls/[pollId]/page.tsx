import { after } from 'next/server';
import { redirect } from 'next/navigation';
import Link from '@/components/AppLink';
import Card from '@/components/Card';
import { verifySessionToken } from '@/lib/auth';
import { getPoll, processPollNotifications } from '@/lib/polls';
import { PollPageClient } from './PollPageClient';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ pollId: string }>;
};

export default async function PollPage(props: PageProps) {
  const payload = await verifySessionToken();
  if (!payload) {
    redirect('/');
  }

  const { pollId } = await props.params;
  const result = await getPoll(pollId, payload.userId);

  if (!result) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Poll not found</h2>
          <p className="text-ink-muted mb-4">
            This poll doesn&apos;t exist or may have been removed.
          </p>
          <Link
            href="/polls"
            className="font-semibold text-primary-dark hover:text-primary-darker"
          >
            See all polls
          </Link>
        </Card>
      </div>
    );
  }

  // Polls close on their own clock; send any results notification that's due
  // without holding up the page.
  after(processPollNotifications);

  return <PollPageClient poll={result.poll} now={result.now} />;
}
