import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getUserLeagues } from '@/lib/data';
import { searchLeagues } from '@/lib/search';

export async function GET(request: NextRequest) {
  const payload = await verifySessionToken();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get('q') ?? '';

  try {
    const leagues = await getUserLeagues(payload.userId);
    return NextResponse.json(searchLeagues(leagues, query));
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
