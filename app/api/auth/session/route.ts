import { NextResponse } from 'next/server';
import { getUserByCookies } from '@/lib/data';

export async function GET() {
  const user = await getUserByCookies('');
  return NextResponse.json({ user });
}
