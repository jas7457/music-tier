import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { SongSubmission, Round, League } from '@/databaseTypes';
import { ObjectId } from 'mongodb';
import { extractTrackId } from '@/lib/spotify';

async function checkRoundIsOpen(roundId: string): Promise<{ isOpen: boolean; error?: string }> {
  try {
    const roundsCollection = await getCollection<Round>('rounds');
    const round = await roundsCollection.findOne({ _id: new ObjectId(roundId) } as any);

    if (!round) {
      return { isOpen: false, error: 'Round not found' };
    }

    // Get the league to calculate round end date
    const leaguesCollection = await getCollection<League>('leagues');
    const league = await leaguesCollection.findOne({ _id: new ObjectId(round.leagueId) } as any);

    if (!league) {
      return { isOpen: false, error: 'League not found' };
    }

    // Calculate round end date: voteStartDate + daysForVoting
    const roundEndDate = round.voteStartDate
      ? round.voteStartDate + (league.daysForVoting * 24 * 60 * 60 * 1000)
      : null;

    const now = Date.now();

    // Check if round has ended
    if (roundEndDate && roundEndDate <= now) {
      return { isOpen: false, error: 'This round has ended and submissions are no longer accepted' };
    }

    // Check if round has started
    if (round.submissionStartDate && round.submissionStartDate > now) {
      return { isOpen: false, error: 'Submissions for this round have not opened yet' };
    }

    return { isOpen: true };
  } catch (error) {
    console.error('Error checking round status:', error);
    return { isOpen: false, error: 'Failed to check round status' };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifySessionToken(sessionToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { roundId } = params;

    // Check if round is still open
    const roundCheck = await checkRoundIsOpen(roundId);
    if (!roundCheck.isOpen) {
      return NextResponse.json(
        { error: roundCheck.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { trackUrl, note } = body;

    if (!trackUrl) {
      return NextResponse.json(
        { error: 'Track URL is required' },
        { status: 400 }
      );
    }

    // Extract track ID from URL
    const trackId = extractTrackId(trackUrl);

    if (!trackId) {
      return NextResponse.json(
        { error: 'Invalid Spotify track URL' },
        { status: 400 }
      );
    }

    const submissionsCollection = await getCollection<SongSubmission>('songSubmissions');

    // Check if user has already submitted for this round
    const existingSubmission = await submissionsCollection.findOne({
      roundId,
      userId: payload.userId
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'You have already submitted a song for this round. Use PUT to update it.' },
        { status: 409 }
      );
    }

    // Create new submission
    const submissionId = new ObjectId();
    const newSubmission: SongSubmission = {
      _id: submissionId.toString(),
      roundId,
      userId: payload.userId,
      trackId,
      note
    };

    await submissionsCollection.insertOne({ ...newSubmission, _id: submissionId } as any);

    return NextResponse.json({ submission: newSubmission });
  } catch (error) {
    console.error('Error submitting song:', error);
    return NextResponse.json(
      { error: 'Failed to submit song' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifySessionToken(sessionToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { roundId } = params;

    // Check if round is still open
    const roundCheck = await checkRoundIsOpen(roundId);
    if (!roundCheck.isOpen) {
      return NextResponse.json(
        { error: roundCheck.error },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { trackUrl, note } = body;

    if (!trackUrl) {
      return NextResponse.json(
        { error: 'Track URL is required' },
        { status: 400 }
      );
    }

    // Extract track ID from URL
    const trackId = extractTrackId(trackUrl);

    if (!trackId) {
      return NextResponse.json(
        { error: 'Invalid Spotify track URL' },
        { status: 400 }
      );
    }

    const submissionsCollection = await getCollection<SongSubmission>('songSubmissions');

    // Update existing submission
    const result = await submissionsCollection.findOneAndUpdate(
      {
        roundId,
        userId: payload.userId
      },
      {
        $set: {
          trackId,
          note
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'No submission found to update' },
        { status: 404 }
      );
    }

    const updatedSubmission = {
      ...result,
      _id: result._id.toString()
    };

    return NextResponse.json({ submission: updatedSubmission });
  } catch (error) {
    console.error('Error updating song submission:', error);
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    );
  }
}
