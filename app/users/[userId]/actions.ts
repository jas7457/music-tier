'use server';

import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { User } from '@/databaseTypes';
import { ObjectId } from 'mongodb';

export async function updateUserPhoto(photoUrl: string) {
  const payload = await verifySessionToken();
  if (!payload) {
    throw new Error('Unauthorized');
  }

  const usersCollection = await getCollection<User>('users');
  const result = await usersCollection.findOneAndUpdate(
    { _id: new ObjectId(payload.userId) },
    { $set: { photoUrl } },
    { returnDocument: 'after' },
  );

  if (!result) {
    throw new Error('User not found');
  }
}
