import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { createPoll, PollError } from '@/lib/polls';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';

export async function POST(request: NextRequest) {
  const payload = await verifySessionToken();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const pollId = await createPoll(body, payload.userId);
    return NextResponse.json({ success: true, pollId });
  } catch (error) {
    if (error instanceof PollError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error('Error creating poll:', error);
    return NextResponse.json(
      { error: unknownToErrorString(error, 'Failed to create poll') },
      { status: 500 },
    );
  }
}
