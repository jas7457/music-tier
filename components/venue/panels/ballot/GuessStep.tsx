'use client';

import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import type { PopulatedRound, PopulatedUser } from '@/lib/types';
import type { useBallot } from './useBallot';
import { CardExtras, Chip, Face, TrackArt, TrackInfo } from './parts';

type Ballot = ReturnType<typeof useBallot>;

/** Step 2: pin a friend's face on the songs you think they brought. */
export function GuessStep({
  round,
  users,
  currentUser,
  ballot,
}: {
  round: PopulatedRound;
  users: PopulatedUser[];
  currentUser: PopulatedUser;
  ballot: Ballot;
}) {
  const [friendId, setFriendId] = useState<string | null>(null);
  const [songId, setSongId] = useState<string | null>(null);
  const { votes, saving } = ballot;

  const friends = users.filter((u) => u._id !== currentUser._id);
  const used = new Set(
    Object.values(votes)
      .map((vote) => vote.userGuessId)
      .filter(Boolean),
  );

  const pin = (submissionId: string, userId: string) => {
    ballot.setGuess(submissionId, userId);
    setFriendId(null);
    setSongId(null);
  };

  const tapFriend = (id: string) => {
    if (saving || used.has(id)) {
      return;
    }
    if (songId) {
      pin(songId, id);
      return;
    }
    setFriendId(friendId === id ? null : id);
  };

  const tapSong = (submissionId: string) => {
    if (saving) {
      return;
    }
    if (friendId) {
      pin(submissionId, friendId);
      return;
    }
    if (votes[submissionId]?.userGuessId) {
      ballot.setGuess(submissionId, undefined);
      return;
    }
    setSongId(songId === submissionId ? null : submissionId);
  };

  const guessed = Object.values(votes).filter((v) => v.userGuessId).length;

  return (
    <>
      <div className="ballot-tray" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="ballot-tray-label">Guess who · {guessed} pinned</div>
          <button
            type="button"
            className="ballot-tray-back"
            disabled={saving}
            onClick={() => ballot.setStep('voting')}
          >
            ← Chips
          </button>
        </div>
        <div className="ballot-faces">
          {friends.map((friend) => (
            <button
              key={friend._id}
              type="button"
              disabled={saving || used.has(friend._id)}
              aria-pressed={friendId === friend._id}
              aria-label={`Pick ${friend.userName}`}
              className={twMerge(
                'ballot-face',
                friendId === friend._id && 'is-selected',
                used.has(friend._id) && 'is-used',
              )}
              onClick={() => tapFriend(friend._id)}
            >
              <span className="ballot-face-img">
                <Face user={friend} />
              </span>
              <span className="ballot-face-name">{friend.userName}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="ballot-hint">
        {friendId
          ? 'Now tap the song they brought.'
          : songId
            ? 'Now tap the friend who brought it.'
            : 'Pick a friend, then a song (or the other way round). Tap a pinned face to clear it. Optional!'}
      </p>

      {round.submissions.map((submission) => {
        const mine = submission.userId === currentUser._id;
        const guessUser = users.find(
          (u) => u._id === votes[submission._id]?.userGuessId,
        );
        const count = votes[submission._id]?.points || 0;
        return (
          <div
            key={submission._id}
            className={twMerge(
              'ballot-card',
              mine && 'is-mine',
              songId === submission._id && 'is-picked',
            )}
          >
            <div className="ballot-card-row">
              <TrackArt submission={submission} round={round} size={48} />
              {mine ? (
                <div className="ballot-hit">
                  <TrackInfo submission={submission} showSubmitterNote={false} />
                  <span className="ballot-mine-tag">Your track</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="ballot-hit"
                  disabled={saving}
                  onClick={() => tapSong(submission._id)}
                >
                  <TrackInfo submission={submission} showSubmitterNote={false} />
                </button>
              )}
              {count > 0 && (
                <span className="ballot-mini-chips" aria-label={`${count} chips`}>
                  <Chip tone={0} />×{count}
                </span>
              )}
              {!mine && (
                <button
                  type="button"
                  className={twMerge('ballot-pin', guessUser && 'is-filled')}
                  disabled={saving}
                  aria-label={
                    guessUser
                      ? `Clear guess ${guessUser.userName}`
                      : `Pin a face on ${submission.trackInfo.title}`
                  }
                  onClick={() => tapSong(submission._id)}
                >
                  {guessUser ? (
                    <div key={guessUser._id}>
                      <Face user={guessUser} />
                    </div>
                  ) : (
                    '?'
                  )}
                </button>
              )}
            </div>
            <CardExtras
              submission={submission}
              note={votes[submission._id]?.note || ''}
              disabled={saving}
              onNoteChange={(note) => ballot.setNote(submission._id, note)}
              placeholder="Add a note (optional)..."
            />
          </div>
        );
      })}
    </>
  );
}
