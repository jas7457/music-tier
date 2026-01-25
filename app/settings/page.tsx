import { getUser } from '@/lib/data';
import { redirect } from 'next/navigation';
import { UserSettingsClient } from './UserSettingsClient';
import { verifySessionToken } from '@/lib/auth';

export default async function SettingsPage() {
  const payload = await verifySessionToken();
  if (!payload) {
    redirect('/');
  }

  const user = await getUser(payload.userId, 'any');

  if (!user) {
    redirect('/');
  }

  return (
    <UserSettingsClient
      user={{ ...user, _id: user._id.toString(), index: 0 }}
    />
  );
}
