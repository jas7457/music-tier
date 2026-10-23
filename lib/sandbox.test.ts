import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSandbox } from './sandbox';

afterEach(() => {
  vi.unstubAllEnvs();
});

function env(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    vi.stubEnv(key, value);
  }
}

describe('isSandbox', () => {
  it('is on for the local sandbox', () => {
    env({ SANDBOX: '1', NODE_ENV: 'development', MONGO_DB_URI: 'mongodb://127.0.0.1:27018/' });
    expect(isSandbox()).toBe(true);
  });

  it('is off without the flag', () => {
    env({ SANDBOX: '', NODE_ENV: 'development', MONGO_DB_URI: 'mongodb://127.0.0.1:27018/' });
    expect(isSandbox()).toBe(false);
  });

  it('is off in production even with the flag', () => {
    env({ SANDBOX: '1', NODE_ENV: 'production', MONGO_DB_URI: 'mongodb://127.0.0.1:27018/' });
    expect(isSandbox()).toBe(false);
  });

  it('is off against a remote database even with the flag', () => {
    env({ SANDBOX: '1', NODE_ENV: 'development', MONGO_DB_URI: 'mongodb+srv://user:pw@cluster.mongodb.net/' });
    expect(isSandbox()).toBe(false);
  });
});
