'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PopulatedRound, PopulatedUser } from '@/lib/types';
import { useData } from '@/lib/DataContext';
import { useToast } from '@/lib/ToastContext';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';

// Same key/shape as components/VotingRound.tsx so drafts carry over.
const LOCAL_STORAGE_KEY = 'VotingRound.votes';

export type VoteRecord = Record<
  string,
  { points: number; note: string; userGuessId?: string }
>;

export type BallotStep = 'voting' | 'guessing' | 'submitted';

type League = {
  _id: string;
  votesPerRound: number;
  users: Array<PopulatedUser>;
};

/** All the ballot state + rules, mirroring VotingRound's semantics. */
export function useBallot(
  round: PopulatedRound,
  league: League,
  currentUser: PopulatedUser,
) {
  const toast = useToast();
  const { refreshData } = useData();
  const [step, setStep] = useState<BallotStep>(
    round.stage === 'voting' ? 'voting' : 'submitted',
  );
  const [saving, setSaving] = useState(false);
  const [votes, setVotes] = useState<VoteRecord>(() => {
    const storedVersion: Partial<VoteRecord> = (() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem(LOCAL_STORAGE_KEY) || '{}',
        );
        if (
          stored.roundId !== round._id ||
          stored.leagueId !== league._id ||
          stored.userId !== currentUser._id
        ) {
          return {};
        }
        const draft: Partial<VoteRecord> = stored.votes ?? {};
        // A draft can only ever hold this user's own unsent points; anything
        // over budget is stale (e.g. saved while showing round totals).
        const draftTotal = Object.values(draft).reduce(
          (sum, vote) => sum + (vote?.points || 0),
          0,
        );
        return draftTotal > league.votesPerRound ? {} : draft;
      } catch {
        return {};
      }
    })();

    return round.submissions.reduce((acc, submission) => {
      const currentVote = round.votes.find(
        (vote) =>
          vote.userId === currentUser._id &&
          vote.submissionId === submission._id,
      );

      const points = (() => {
        if (round.stage === 'currentUserVotingCompleted') {
          return round.votes.reduce((sum, vote) => {
            return (
              sum + (vote.submissionId === submission._id ? vote.points : 0)
            );
          }, 0);
        }
        return currentVote?.points ?? 0;
      })();

      if (currentVote) {
        acc[submission._id] = {
          points,
          note: currentVote.note || '',
          userGuessId: currentVote.userGuessId,
        };
      } else {
        acc[submission._id] = {
          points: 0,
          note: '',
          userGuessId: undefined,
          ...(storedVersion[submission._id] ?? {}),
        };
      }
      return acc;
    }, {} as VoteRecord);
  });

  useEffect(() => {
    // Only unsent ballots are drafts; after voting the view shows totals.
    if (round.stage !== 'voting') {
      return;
    }
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        roundId: round._id,
        leagueId: league._id,
        userId: currentUser._id,
        votes,
      }),
    );
  }, [votes, round.stage, round._id, league._id, currentUser._id]);

  const totalVotesUsed = useMemo(() => {
    return Object.values(votes).reduce(
      (sum, vote) => sum + vote.points || 0,
      0,
    );
  }, [votes]);
  const remainingVotes = league.votesPerRound - totalVotesUsed;

  const changeVote = (submissionId: string, change: number) => {
    if (change > 0 && totalVotesUsed >= league.votesPerRound) {
      return;
    }
    setVotes((prev) => ({
      ...prev,
      [submissionId]: {
        points: Math.max(0, (prev[submissionId]?.points || 0) + change),
        note: prev[submissionId]?.note || '',
        userGuessId: prev[submissionId]?.userGuessId,
      },
    }));
  };

  const setNote = (submissionId: string, note: string) => {
    setVotes((prev) => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], note },
    }));
  };

  const setGuess = (submissionId: string, userId: string | undefined) => {
    setVotes((prev) => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], userGuessId: userId },
    }));
  };

  /** Resolves true when the POST succeeded. */
  const save = async () => {
    if (round.stage !== 'voting') {
      return false;
    }
    try {
      setSaving(true);
      const response = await fetch(`/api/rounds/${round._id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(votes),
      });
      if (!response.ok) {
        throw new Error(`Failed to submit vote for ${round._id}`);
      }
      return true;
    } catch (error) {
      toast.show({
        title: 'Failed to save some votes',
        variant: 'error',
        message: unknownToErrorString(error, 'Failed to save some votes'),
      });
      return false;
    } finally {
      setSaving(false);
      refreshData('manual');
    }
  };

  const { usersThatHaveVoted, usersThatHaveNotVoted } = useMemo(() => {
    return league.users.reduce(
      (acc, user) => {
        const hasVoted = (() => {
          if (round.stage === 'completed') {
            return round.votes.some(
              (vote) => vote.userId === user._id && vote.points > 0,
            );
          }
          const userVotes = round.votes.reduce((sum, vote) => {
            return vote.userId === user._id ? sum + vote.points : sum;
          }, 0);
          return userVotes >= league.votesPerRound;
        })();
        if (hasVoted) {
          acc.usersThatHaveVoted.push(user);
          acc.usersThatHaveVoted.sort((userA, userB) => {
            const voteA = round.votes.find((vote) => vote.userId === userA._id);
            const voteB = round.votes.find((vote) => vote.userId === userB._id);
            if (!voteA || !voteB) {
              return 0;
            }
            return voteA.voteDate - voteB.voteDate;
          });
        } else {
          acc.usersThatHaveNotVoted.push(user);
        }
        return acc;
      },
      {
        usersThatHaveVoted: [] as PopulatedUser[],
        usersThatHaveNotVoted: [] as PopulatedUser[],
      },
    );
  }, [league, round]);

  return {
    step,
    setStep,
    saving,
    votes,
    totalVotesUsed,
    remainingVotes,
    changeVote,
    setNote,
    setGuess,
    save,
    usersThatHaveVoted,
    usersThatHaveNotVoted,
  };
}
