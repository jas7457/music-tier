import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { Vote, Round, League } from '@/databaseTypes';
import { ObjectId } from 'mongodb';

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
    const body = await request.json();
    const { submissionId, points, note } = body;

    if (typeof points !== 'number' || points < 0) {
      return NextResponse.json(
        { error: 'Invalid points value' },
        { status: 400 }
      );
    }

    // Get the round and league to validate
    const roundsCollection = await getCollection<Round>('rounds');
    const round = await roundsCollection.findOne({ _id: new ObjectId(roundId) } as any);

    if (!round) {
      return NextResponse.json(
        { error: 'Round not found' },
        { status: 404 }
      );
    }

    const leaguesCollection = await getCollection<League>('leagues');
    const league = await leaguesCollection.findOne({ _id: new ObjectId(round.leagueId) } as any);

    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }

    // Verify round is in voting stage
    const now = Date.now();
    const voteEndDate = round.voteStartDate + (league.daysForVoting * 24 * 60 * 60 * 1000);

    if (!round.voteStartDate || round.voteStartDate > now) {
      return NextResponse.json(
        { error: 'Voting has not started yet' },
        { status: 403 }
      );
    }

    if (voteEndDate <= now) {
      return NextResponse.json(
        { error: 'Voting has ended' },
        { status: 403 }
      );
    }

    const votesCollection = await getCollection<Vote>('votes');

    // Get all user's votes for this round to validate total
    const allUserVotes = await votesCollection
      .find({ userId: payload.userId })
      .toArray();

    // Filter votes for this round's submissions
    const submissionsCollection = await getCollection('songSubmissions');
    const roundSubmissions = await submissionsCollection
      .find({ roundId })
      .toArray();

    const roundSubmissionIds = roundSubmissions.map(s => s._id.toString());
    const userRoundVotes = allUserVotes.filter(v =>
      roundSubmissionIds.includes(v.submissionId)
    );

    // Calculate total votes (excluding the one we're updating)
    const totalVotes = userRoundVotes.reduce((sum, vote) => {
      if (vote.submissionId === submissionId) {
        return sum; // Don't count the one we're updating
      }
      return sum + vote.points;
    }, 0);

    // Add the new points
    const newTotal = totalVotes + points;

    if (newTotal > league.votesPerRound) {
      return NextResponse.json(
        { error: `You can only use ${league.votesPerRound} votes total. You would have ${newTotal} votes.` },
        { status: 400 }
      );
    }

    // If points is 0, delete the vote; otherwise upsert
    if (points === 0) {
      await votesCollection.deleteOne({
        userId: payload.userId,
        submissionId
      });

      return NextResponse.json({ success: true, deleted: true });
    } else {
      // Check if vote already exists
      const existingVote = await votesCollection.findOne({
        userId: payload.userId,
        submissionId
      });

      if (existingVote) {
        // Update existing vote
        const updateFields: any = { points };
        if (note !== undefined) {
          updateFields.note = note || null;
        }

        await votesCollection.updateOne(
          {
            userId: payload.userId,
            submissionId
          },
          {
            $set: updateFields
          }
        );

        return NextResponse.json({
          vote: {
            ...existingVote,
            _id: existingVote._id.toString(),
            points,
            note: note || existingVote.note
          }
        });
      } else {
        // Create new vote
        const voteId = new ObjectId();
        const vote: Vote = {
          _id: voteId.toString(),
          userId: payload.userId,
          submissionId,
          points,
          note: note || undefined
        };

        await votesCollection.insertOne({ ...vote, _id: voteId } as any);

        return NextResponse.json({ vote });
      }
    }
  } catch (error) {
    console.error('Error saving vote:', error);
    return NextResponse.json(
      { error: 'Failed to save vote' },
      { status: 500 }
    );
  }
}
