import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { User } from '@/databaseTypes';
import { ObjectId } from 'mongodb';
import { getCarrierGateway, sendTextEmail } from '@/lib/emailService';

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, phoneCarrier } = body;

    if (!phoneNumber || !phoneCarrier) {
      return NextResponse.json(
        { error: 'Phone number and carrier are required' },
        { status: 400 },
      );
    }

    const gateway = getCarrierGateway(phoneCarrier);
    if (!gateway) {
      return NextResponse.json({ error: 'Invalid carrier' }, { status: 400 });
    }

    // Generate verification code
    const code = generateVerificationCode();

    // Save the code to the user's record
    const usersCollection = await getCollection<User>('users');
    await usersCollection.updateOne(
      { _id: new ObjectId(payload.userId) },
      {
        $set: {
          phoneVerificationCode: code,
        },
      },
    );

    await sendTextEmail({
      number: phoneNumber,
      phoneCarrier,
      message: `Your verification code is: ${code}`,
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
