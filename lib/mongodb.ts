import { MongoClient, Db, Collection, Document } from 'mongodb';
import { cache } from 'react';

if (!process.env.MONGO_DB_URI) {
  throw new Error(
    'Please define the MONGO_DB_URI environment variable inside .env.local',
  );
}

const uri = process.env.MONGO_DB_URI;
const options = {
  maxPoolSize: 10,
  connectTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export const getDatabase = cache(async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db('music-tier');
});

export const getCollection = cache(async function getCollection<
  T extends Document = Document,
>(collectionName: string): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
});

export default clientPromise;
