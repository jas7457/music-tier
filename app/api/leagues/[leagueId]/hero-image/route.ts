import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { League } from '@/databaseTypes';
import { ObjectId } from 'mongodb';
import { triggerRealTimeUpdate } from '@/lib/pusher-server';

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ leagueId: string }> },
) {
  const params = await props.params;
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { leagueId } = params;
    const body = await request.json();
    const { heroImageUrl, heroImageFocalX, heroImageFocalY } = body;

    const updates: Partial<League> = {};

    if (heroImageUrl !== undefined) {
      if (typeof heroImageUrl !== 'string' || !heroImageUrl.trim()) {
        return NextResponse.json(
          { error: 'heroImageUrl must be a non-empty string' },
          { status: 400 },
        );
      }
      updates.heroImageUrl = heroImageUrl.trim();
      // Reset focal point on image change unless explicitly provided.
      if (heroImageFocalX === undefined) updates.heroImageFocalX = 50;
      if (heroImageFocalY === undefined) updates.heroImageFocalY = 50;
    }

    if (heroImageFocalX !== undefined) {
      updates.heroImageFocalX = heroImageFocalX;
    }
    if (heroImageFocalY !== undefined) {
      updates.heroImageFocalY = heroImageFocalY;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided to update' },
        { status: 400 },
      );
    }

    // Get the league from the database
    const leaguesCollection = await getCollection<League>('leagues');
    const league = await leaguesCollection.findOne({
      _id: new ObjectId(leagueId),
    });

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Check if user is authorized to update the hero image
    if (league.heroImageUserId !== payload.userId) {
      return NextResponse.json(
        { error: "You are not authorized to update this league's hero image" },
        { status: 403 },
      );
    }

    const result = await leaguesCollection.findOneAndUpdate(
      { _id: new ObjectId(leagueId) },
      { $set: updates },
      { returnDocument: 'after' },
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update league' },
        { status: 500 },
      );
    }

    // Trigger real-time update for other users
    triggerRealTimeUpdate();

    return NextResponse.json({
      success: true,
      heroImageUrl: result.heroImageUrl,
      heroImageFocalX: result.heroImageFocalX,
      heroImageFocalY: result.heroImageFocalY,
    });
  } catch (error) {
    console.error('Error updating hero image:', error);
    return NextResponse.json(
      { error: 'Failed to update hero image' },
      { status: 500 },
    );
  }
}
