import { vi } from 'vitest';

// Tests never talk to a real database: every getCollection() call is served
// from the in-memory fake (see fakeMongo.ts). This also avoids lib/mongodb.ts
// throwing at import time when MONGO_DB_URI isn't set.
vi.mock('@/lib/mongodb', async () => {
  const { fakeDb } = await import('./fakeMongo');
  const getDatabase = async () => fakeDb;
  const getCollection = async (name: string) => fakeDb.collection(name);
  return { getDatabase, getCollection, default: Promise.resolve(null) };
});
