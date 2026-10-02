import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { castVote, PollError } from '@/lib/polls';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ pollId: string }> },
) {
  const payload = await verifySessionToken();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pollId } = await props.params;

  try {
    const body = await request.json();
    await castVote(pollId, payload.userId, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PollError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('Error voting in poll:', error);
    return NextResponse.json(
      { error: unknownToErrorString(error, 'Failed to record vote') },
      { status: 500 },
    );
  }
}
