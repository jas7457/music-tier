import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { getCollection } from '@/lib/mongodb';
import { SongSubmission, TrackInfo } from '@/databaseTypes';
import { ObjectId } from 'mongodb';
import { triggerRealTimeUpdate } from '@/lib/pusher-server';
import { getLeagueByRoundId, getUserLeagues } from '@/lib/data';
import { getAllRounds } from '@/lib/utils/getAllRounds';
import { submissionNotifications } from '@/lib/notifications';
import { setScheduledNotifications } from '@/lib/scheduledNotifications';
import { PopulatedRound, PopulatedUser } from '@/lib/types';
import { assertNever } from '@/lib/utils/never';
import { getTrackMatchReason } from '@/lib/utils/trackMatch';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ roundId: string }> },
) {
  const params = await props.params;
  return handleRequest(request, { roundId: params.roundId, method: 'ADD' });
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ roundId: string }> },
) {
  const params = await props.params;
  return handleRequest(request, { roundId: params.roundId, method: 'UPDATE' });
}

async function handleRequest(
  request: NextRequest,
  { roundId, method }: { roundId: string; method: 'ADD' | 'UPDATE' },
) {
  try {
    const payload = await verifySessionToken();
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    if (!roundId) {
      return NextResponse.json(
        { error: 'Round ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { trackInfo, note, youtubeURL, force } = body;

    if (!trackInfo || !trackInfo.trackId) {
      return NextResponse.json(
        { error: 'Track URL is required' },
        { status: 400 },
      );
    }

    const userLeagues = await getUserLeagues(payload.userId);

    // The duplicate check below needs every league, so the initial lookup
    // reuses those; the post-write refetch only needs this round's league.
    const findRound = (leagues: typeof userLeagues) => {
      for (const league of leagues) {
        const rounds = getAllRounds(league, {
          includeFake: false,
        });

        for (const round of rounds) {
          if (round._id.toString() === roundId) {
            return { round, league };
          }
        }
      }
      return { round: null, league: null };
    };
    const getData = async () => {
      return (
        (await getLeagueByRoundId(roundId, payload.userId)) ?? {
          round: null,
          league: null,
        }
      );
    };

    const { round: foundRound, league: foundLeague } = findRound(userLeagues);

    if (!foundRound) {
      return NextResponse.json(
        { error: 'No roound was found, Charlie Brown' },
        { status: 404 },
      );
    }

    if (foundRound.stage !== 'submission') {
      return NextResponse.json(
        {
          error: `Submissions are not open for this round. The round is currently in the "${foundRound.stage}" stage.`,
        },
        { status: 403 },
      );
    }

    const existingSubmission = foundRound.submissions.find(
      (sub) => sub.userId === payload.userId,
    );

    if (existingSubmission && method === 'ADD') {
      return NextResponse.json(
        {
          error:
            'You have already submitted a song for this round. Use PUT to update it.',
        },
        { status: 409 },
      );
    }

    const getDuplicateReturnResponse = (
      round: PopulatedRound,
      trackInfo: TrackInfo,
    ) => {
      const songsInfo = getExistingSongsInfo(round, trackInfo);
      for (const songInfo of songsInfo) {
        if (songInfo.isMatch) {
          if (songInfo.user._id !== payload.userId) {
            const matchReason = songInfo.matchReason;
            switch (matchReason) {
              case 'EXACT_MATCH': {
                return NextResponse.json(
                  {
                    error:
                      'You have great taste! This song has already been submitted by another user in this round.',
                  },
                  { status: 409 },
                );
              }
              case 'ARTIST_MATCH':
              case 'TITLE_AND_ARTIST_MATCH': {
                if (force) {
                  return null;
                }
                return NextResponse.json(
                  {
                    success: false,
                    code: matchReason,
                    trackInfo: songInfo.trackInfo,
                  },
                  { status: 200 },
                );
              }
              default: {
                assertNever(matchReason);
              }
            }
          }
        }
      }
      return null;
    };

    const duplicateResponse = getDuplicateReturnResponse(foundRound, trackInfo);
    if (duplicateResponse) {
      return duplicateResponse;
    }

    const submissionsCollection =
      await getCollection<SongSubmission>('songSubmissions');

    if (!force) {
      // Check every submission in the user's other rounds, read straight
      // from the database: populated rounds leave out songs from people who
      // didn't vote once a round is finished.
      const otherRoundIds = userLeagues
        .flatMap((league) => getAllRounds(league, { includeFake: false }))
        .map((round) => round._id.toString())
        .filter((id) => id !== roundId);
      const otherSubmissions = await submissionsCollection
        .find({ roundId: { $in: otherRoundIds } })
        .toArray();
      const submissionsByRound = new Map<string, SongSubmission[]>();
      for (const submission of otherSubmissions) {
        const group = submissionsByRound.get(submission.roundId) ?? [];
        group.push(submission);
        submissionsByRound.set(submission.roundId, group);
      }

      // Rounds are checked in order; within a round, a matching song is
      // reported before a matching artist.
      for (const otherRoundId of otherRoundIds) {
        const submissions = submissionsByRound.get(otherRoundId) ?? [];
        const previousSub = submissions.find((sub) => {
          const matchReason = getTrackMatchReason(trackInfo, sub.trackInfo);
          return (
            matchReason === 'EXACT_MATCH' ||
            matchReason === 'TITLE_AND_ARTIST_MATCH'
          );
        });
        if (previousSub) {
          return NextResponse.json(
            {
              success: false,
              code: 'PREVIOUSLY_SUBMITTED',
              trackInfo: previousSub.trackInfo,
              variant: 'SONG',
            },
            { status: 200 },
          );
        }

        const previousArtistSub = submissions.find(
          (sub) =>
            getTrackMatchReason(trackInfo, sub.trackInfo) === 'ARTIST_MATCH',
        );
        if (previousArtistSub) {
          return NextResponse.json(
            {
              success: false,
              code: 'PREVIOUSLY_SUBMITTED',
              trackInfo: previousArtistSub.trackInfo,
              variant: 'ARTIST',
            },
            { status: 200 },
          );
        }
      }
    }

    const now = Date.now();

    const newSubmission = await (async () => {
      if (method === 'ADD') {
        // Create new submission
        const submissionId = new ObjectId();
        const newSubmission: SongSubmission = {
          _id: submissionId,
          roundId,
          userId: payload.userId,
          trackInfo,
          note,
          submissionDate: now,
          ...(youtubeURL ? { youtubeURL } : {}),
        };

        await submissionsCollection.insertOne(newSubmission);
        return newSubmission;
      } else {
        // Update existing submission
        const result = await submissionsCollection.findOneAndUpdate(
          {
            roundId,
            userId: payload.userId,
          },
          {
            $set: {
              trackInfo,
              note,
              submissionDate: now,
              ...(youtubeURL ? { youtubeURL } : {}),
            },
            ...(youtubeURL ? {} : { $unset: { youtubeURL: '' } }),
          },
          { returnDocument: 'after' },
        );

        if (!result) {
          throw new Error('No submission found to update');
        }

        const updatedSubmission = {
          ...result,
          _id: result._id.toString(),
        };
        return updatedSubmission;
      }
    })();

    const newData = await getData();

    if (newData.round) {
      const newDuplicateResponse = getDuplicateReturnResponse(
        newData.round,
        trackInfo,
      );
      if (newDuplicateResponse) {
        await submissionsCollection.deleteOne({
          roundId,
          userId: payload.userId,
          _id: new ObjectId(newSubmission._id),
        });

        return newDuplicateResponse;
      }
    }

    await Promise.all([
      method === 'ADD'
        ? submissionNotifications({
            league: foundLeague,
            before: {
              round: foundRound,
            },
            after: {
              round: newData.round || undefined,
            },
          })
        : Promise.resolve(),
      setScheduledNotifications(newData.league!),
    ]);

    triggerRealTimeUpdate();

    return NextResponse.json({ submission: newSubmission });
  } catch (error) {
    console.error('Error submitting song:', error);
    return NextResponse.json(
      { error: 'Failed to submit song' },
      { status: 500 },
    );
  }
}

function getExistingSongsInfo(
  round: PopulatedRound,
  trackInfo: TrackInfo,
): Array<
  | {
      isMatch: true;
      user: PopulatedUser;
      trackInfo: TrackInfo;
      matchReason: 'EXACT_MATCH' | 'TITLE_AND_ARTIST_MATCH' | 'ARTIST_MATCH';
    }
  | { isMatch: false; matchReason: null }
> {
  return round.submissions.map((sub) => {
    const matchReason = getTrackMatchReason(trackInfo, sub.trackInfo);
    if (matchReason) {
      return {
        isMatch: true,
        matchReason,
        user: sub.userObject!,
        trackInfo: sub.trackInfo,
      };
    }
    return { isMatch: false, matchReason: null };
  });
}
