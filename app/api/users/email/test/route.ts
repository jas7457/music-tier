import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { User } from '@/databaseTypes';
import { ObjectId } from 'mongodb';
import { sendEmail } from '@/lib/emailService';
import { APP_NAME } from '@/lib/utils/constants';

export async function POST(request: NextRequest) {
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usersCollection = await getCollection<User>('users');
    const user = await usersCollection.findOne({
      _id: new ObjectId(payload.userId),
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { emailAddress } = body;

    if (!emailAddress) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 },
      );
    }

    await sendEmail({
      to: {
        email: emailAddress,
        fullName: `${user.firstName} ${user.lastName}`,
      },
      subject: `${APP_NAME} Test Email`,
      html: `<p>This is a test email from ${APP_NAME}. You're all good!</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 },
    );
  }
}
