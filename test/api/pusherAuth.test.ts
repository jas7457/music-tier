import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { addLeague, addUsers, id, resetDb } from '../fixtures';

const mocks = vi.hoisted(() => ({
  session: null as { userId: string } | null,
  canUsePusher: true,
  authorizeChannel: vi.fn(
    (socketId: string, channel: string, member: unknown) => ({
      auth: `signed:${socketId}:${channel}`,
      channel_data: JSON.stringify(member),
    }),
  ),
}));

vi.mock('@/lib/auth', () => ({
  verifySessionToken: async () => mocks.session,
}));
vi.mock('@/lib/pusher-server', () => ({
  canUsePusher: () => mocks.canUsePusher,
  getPusherServer: () => ({ authorizeChannel: mocks.authorizeChannel }),
}));

import { POST } from '@/app/api/pusher/auth/route';

function request(channel: string, socketId = '123.456') {
  const body = new URLSearchParams({ socket_id: socketId, channel_name: channel });
  return new NextRequest('https://localhost/api/pusher/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
}

describe('POST /api/pusher/auth (venue presence)', () => {
  beforeEach(() => {
    resetDb();
    mocks.session = null;
    mocks.canUsePusher = true;
    mocks.authorizeChannel.mockClear();
  });

  it('lets a league member into their venue, as themselves', async () => {
    const [alice, bob] = addUsers(2);
    const league = addLeague([alice, bob]);
    mocks.session = { userId: id(alice) };

    const response = await POST(request(`presence-venue-${id(league)}`));

    expect(response.status).toBe(200);
    expect(mocks.authorizeChannel).toHaveBeenCalledWith(
      '123.456',
      `presence-venue-${id(league)}`,
      {
        user_id: id(alice),
        user_info: { userName: alice.userName, photoUrl: alice.photoUrl },
      },
    );
  });

  it('turns away people who are signed out', async () => {
    const [alice] = addUsers(1);
    const league = addLeague([alice]);

    const response = await POST(request(`presence-venue-${id(league)}`));

    expect(response.status).toBe(401);
    expect(mocks.authorizeChannel).not.toHaveBeenCalled();
  });

  it("turns away people who aren't in the league", async () => {
    const [alice, outsider] = addUsers(2);
    const league = addLeague([alice]);
    mocks.session = { userId: id(outsider) };

    const response = await POST(request(`presence-venue-${id(league)}`));

    expect(response.status).toBe(403);
    expect(mocks.authorizeChannel).not.toHaveBeenCalled();
  });

  it('only signs venue channels', async () => {
    const [alice] = addUsers(1);
    mocks.session = { userId: id(alice) };

    const response = await POST(request('private-something-else'));

    expect(response.status).toBe(403);
    expect(mocks.authorizeChannel).not.toHaveBeenCalled();
  });

  it('is off when Pusher is (e.g. a sandbox without its own test app)', async () => {
    const [alice] = addUsers(1);
    const league = addLeague([alice]);
    mocks.session = { userId: id(alice) };
    mocks.canUsePusher = false;

    const response = await POST(request(`presence-venue-${id(league)}`));

    expect(response.status).toBe(403);
  });
});
