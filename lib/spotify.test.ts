import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRedirectUri } from './spotify';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getRedirectUri', () => {
  it('uses the address you are on, so preview deploys come back to themselves', () => {
    vi.stubEnv('NEXT_PUBLIC_SPOTIFY_REDIRECT_URI', '');
    expect(
      getRedirectUri('https://music-tier-git-venue-3d-team.vercel.app'),
    ).toBe('https://music-tier-git-venue-3d-team.vercel.app/callback');
  });

  it('lets an explicitly configured URI win (e.g. an ngrok tunnel)', () => {
    vi.stubEnv('NEXT_PUBLIC_SPOTIFY_REDIRECT_URI', 'https://tunnel.example/callback');
    expect(getRedirectUri('https://music-tier.vercel.app')).toBe(
      'https://tunnel.example/callback',
    );
  });

  it('falls back to production when there is no address to go on', () => {
    vi.stubEnv('NEXT_PUBLIC_SPOTIFY_REDIRECT_URI', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(getRedirectUri()).toMatch(/\/callback$/);
  });
});
