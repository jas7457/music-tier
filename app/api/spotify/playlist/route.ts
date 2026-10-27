import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getUserByCookies } from '@/lib/data';
import { triggerRealTimeUpdate } from '@/lib/pusher-server';
import { getCollection } from '@/lib/mongodb';
import type { League, Round } from '@/databaseTypes';
import { createPlaylist, getPlaylistStatus } from '@/lib/spotifyPlaylist';

/**
 * Returns the round's Spotify playlist, making it first if needed.
 *
 * If the round already has a playlist and it still exists, that one is
 * returned. If it's gone (someone deleted it), a new one is made from the
 * round's songs and saved on the round, so everyone gets the new one.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserByCookies('');
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const accessToken = request.cookies.get('spotify_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Spotify access token found' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { name, description, songs, roundId } = body;
    if (
      !name ||
      !description ||
      typeof roundId !== 'string' ||
      !ObjectId.isValid(roundId) ||
      !Array.isArray(songs)
    ) {
      return NextResponse.json({ error: 'Incorrect data' }, { status: 400 });
    }

    const [roundsCollection, leaguesCollection] = await Promise.all([
      getCollection<Round>('rounds'),
      getCollection<League>('leagues'),
    ]);
    const round = await roundsCollection.findOne({
      _id: new ObjectId(roundId),
    });
    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }
    const league = await leaguesCollection.findOne({
      _id: new ObjectId(round.leagueId),
      users: user._id,
    });
    if (!league) {
      return NextResponse.json(
        { error: 'Not in this league' },
        { status: 403 },
      );
    }

    const previousId = round.spotifyPlaylistId;
    if (previousId) {
      const status = await getPlaylistStatus({
        playlistId: previousId,
        accessToken,
        viewerSpotifyId: user.spotifyId,
      });
      if (status === 'exists') {
        return NextResponse.json({ success: true, playlistId: previousId });
      }
    }

    const created = await createPlaylist({
      accessToken,
      name,
      description,
      uris: songs.filter((song): song is string => typeof song === 'string'),
    });
    if ('error' in created) {
      return NextResponse.json(
        { error: created.error },
        { status: created.status },
      );
    }

    // Only replace the playlist we checked: if someone else saved a new one
    // in the meantime, keep theirs so everyone ends up on the same playlist.
    const saved = await roundsCollection.updateOne(
      {
        _id: round._id,
        spotifyPlaylistId: previousId ?? { $exists: false },
      },
      { $set: { spotifyPlaylistId: created.playlistId } },
    );
    if (saved.matchedCount === 0) {
      const latest = await roundsCollection.findOne({ _id: round._id });
      if (latest?.spotifyPlaylistId) {
        return NextResponse.json({
          success: true,
          playlistId: latest.spotifyPlaylistId,
        });
      }
    }

    triggerRealTimeUpdate();

    return NextResponse.json({
      success: true,
      playlistId: created.playlistId,
      recreated: Boolean(previousId),
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get spotify playlist: ${error}` },
      { status: 500 },
    );
  }
}
