'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import Card from '@/components/Card';
import { Breadcrumb, HomeIcon } from '@/components/Breadcrumb';
import { HapticButton } from '@/components/HapticButton';
import { MultiLine } from '@/components/MultiLine';
import {
  PollCreator,
  PollStatusPill,
  PollTiming,
} from '@/components/polls/PollMeta';
import type { PollQuestion } from '@/databaseTypes';
import type { PollQuestionResults, PopulatedPoll } from '@/lib/types';
import { usePollClock, formatDuration } from '@/lib/hooks/usePollClock';
import { useToast } from '@/lib/ToastContext';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';
import { MAX_POLL_OTHER_LENGTH } from '@/lib/utils/constants';

export function PollPageClient({
  poll,
  now: initialNow,
}: {
  poll: PopulatedPoll;
  now: number;
}) {
  const now = usePollClock([poll], initialNow);

  const body = (() => {
    if (poll.results) {
      return <PollResults poll={poll} />;
    }
    if (poll.status === 'upcoming') {
      return (
        <Notice>
          This poll opens in {formatDuration(poll.startDate - now)}.
        </Notice>
      );
    }
    if (poll.hasVoted) {
      return (
        <Notice>
          <span className="font-semibold text-ink">Your vote is in.</span>{' '}
          Results will be revealed when the poll closes in{' '}
          {formatDuration(poll.endDate - now)}, or as soon as everyone has
          voted.
        </Notice>
      );
    }
    return <PollVoteForm poll={poll} />;
  })();

  return (
    <div className="max-w-3xl mx-auto">
      <Breadcrumb
        items={[
          { label: '', icon: <HomeIcon />, href: '/' },
          { label: 'Polls', href: '/polls' },
          { label: poll.title },
        ]}
      />

      <Card className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="flex-1 min-w-0 text-2xl font-bold tracking-tight leading-snug">
            {poll.title}
          </h1>
          <PollStatusPill poll={poll} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <PollCreator poll={poll} />
          <span aria-hidden="true" className="text-ink-subtle">
            ·
          </span>
          <PollTiming poll={poll} now={now} />
        </div>
        {poll.description && (
          <p className="mt-4 text-ink-muted">
            <MultiLine>{poll.description}</MultiLine>
          </p>
        )}

        <PollProgress poll={poll} />

        <div className="mt-6">{body}</div>
      </Card>
    </div>
  );
}

/** "2 of 8 people have voted · 6 left to vote", with a progress bar. */
function PollProgress({ poll }: { poll: PopulatedPoll }) {
  const remaining = poll.eligibleCount - poll.eligibleVoterCount;
  const percent =
    poll.eligibleCount > 0
      ? Math.round((poll.eligibleVoterCount / poll.eligibleCount) * 100)
      : 0;
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-3 mb-1.5 text-sm">
        <span className="font-medium text-ink">
          {poll.eligibleVoterCount} of {poll.eligibleCount}{' '}
          {poll.eligibleCount === 1 ? 'person has' : 'people have'} voted
        </span>
        {poll.status !== 'closed' && (
          <span className="text-ink-muted whitespace-nowrap">
            {remaining === 0 ? 'Everyone is in' : `${remaining} left to vote`}
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-ink/8 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-control bg-white/60 ring-1 ring-white/80 text-ink-muted">
      {children}
    </div>
  );
}

const OTHER = '__other__';

type QuestionDraft = { selected: string[]; otherText: string };
const EMPTY_DRAFT: QuestionDraft = { selected: [], otherText: '' };

function isAnswered(draft: QuestionDraft) {
  const hasOther = draft.selected.includes(OTHER);
  return (
    draft.selected.length > 0 && (!hasOther || draft.otherText.trim() !== '')
  );
}

/**
 * Heading for one question. Single-question polls usually have no question
 * text of their own (the poll title is the question), so nothing is shown.
 */
function QuestionHeading({
  poll,
  question,
  index,
}: {
  poll: PopulatedPoll;
  question: PollQuestion;
  index: number;
}) {
  if (poll.questions.length === 1 && !question.text) {
    return null;
  }
  return (
    <h2 className="text-lg font-semibold text-ink leading-snug">
      {poll.questions.length > 1 && (
        <span className="text-ink-subtle font-medium mr-1.5">{index + 1}.</span>
      )}
      {question.text}
    </h2>
  );
}

function PollVoteForm({ poll }: { poll: PopulatedPoll }) {
  const router = useRouter();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, QuestionDraft>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDraft = (questionId: string) => drafts[questionId] ?? EMPTY_DRAFT;
  const unansweredCount = poll.questions.filter(
    (question) => !isAnswered(getDraft(question.id)),
  ).length;
  const canSubmit = unansweredCount === 0 && !isSubmitting;

  const updateDraft = (
    questionId: string,
    update: (draft: QuestionDraft) => QuestionDraft,
  ) => {
    setDrafts((current) => ({
      ...current,
      [questionId]: update(current[questionId] ?? EMPTY_DRAFT),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/polls/${poll._id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: poll.questions.map((question) => {
            const draft = getDraft(question.id);
            return {
              questionId: question.id,
              optionIds: draft.selected.filter((id) => id !== OTHER),
              otherText: draft.selected.includes(OTHER)
                ? draft.otherText
                : undefined,
            };
          }),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit vote');
      }
      toast.show({ variant: 'success', message: 'Vote submitted!' });
      router.refresh();
    } catch (error) {
      toast.show({
        variant: 'error',
        message: unknownToErrorString(error, 'Failed to submit vote'),
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {poll.questions.map((question, index) => (
        <QuestionVote
          key={question.id}
          poll={poll}
          question={question}
          index={index}
          draft={getDraft(question.id)}
          onChange={(update) => updateDraft(question.id, update)}
        />
      ))}

      <div className="flex flex-col gap-2">
        <HapticButton
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-primary-dark hover:bg-primary-darker text-white font-semibold py-3 px-4 rounded-control shadow-soft hover:shadow-float transition-all disabled:bg-ink-subtle disabled:shadow-none disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Vote'}
        </HapticButton>
        {poll.questions.length > 1 && unansweredCount > 0 && (
          <p className="text-sm text-ink-muted text-center">
            Answer {unansweredCount} more{' '}
            {unansweredCount === 1 ? 'question' : 'questions'} to submit.
          </p>
        )}
        <p className="text-xs text-ink-subtle text-center">
          Your vote is anonymous and can&apos;t be changed once submitted.
          Results are revealed when the poll closes.
        </p>
      </div>
    </form>
  );
}

function QuestionVote({
  poll,
  question,
  index,
  draft,
  onChange,
}: {
  poll: PopulatedPoll;
  question: PollQuestion;
  index: number;
  draft: QuestionDraft;
  onChange: (update: (draft: QuestionDraft) => QuestionDraft) => void;
}) {
  const isOtherSelected = draft.selected.includes(OTHER);

  const toggle = (id: string) => {
    onChange((current) => {
      if (!question.allowMultiple) {
        return { ...current, selected: [id] };
      }
      return {
        ...current,
        selected: current.selected.includes(id)
          ? current.selected.filter((existing) => existing !== id)
          : [...current.selected, id],
      };
    });
  };

  const choices = [
    ...question.options.map((option) => ({ id: option.id, text: option.text })),
    ...(question.allowOther ? [{ id: OTHER, text: 'Other' }] : []),
  ];

  return (
    <section className="flex flex-col gap-3">
      <div>
        <QuestionHeading poll={poll} question={question} index={index} />
        <p className="text-sm text-ink-subtle mt-0.5">
          {question.allowMultiple ? 'Pick all that apply.' : 'Pick one.'}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {choices.map((choice) => {
          const isSelected = draft.selected.includes(choice.id);
          return (
            <HapticButton
              key={choice.id}
              type="button"
              onClick={() => toggle(choice.id)}
              className={twMerge(
                'w-full text-left px-4 py-3 rounded-control ring-1 flex items-center gap-3 font-medium',
                isSelected
                  ? 'bg-primary-lightest ring-primary text-primary-darkest shadow-soft'
                  : 'bg-white/60 ring-ink/10 text-ink hover:bg-white/90 hover:ring-ink/20',
              )}
            >
              <span
                aria-hidden="true"
                className={twMerge(
                  'w-5 h-5 shrink-0 ring-2 flex items-center justify-center transition-colors',
                  question.allowMultiple ? 'rounded-md' : 'rounded-full',
                  isSelected
                    ? 'bg-primary-dark ring-primary-dark text-white'
                    : 'ring-ink/25',
                )}
              >
                {isSelected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span>{choice.text}</span>
            </HapticButton>
          );
        })}
        {isOtherSelected && (
          <textarea
            aria-label="Your answer"
            value={draft.otherText}
            maxLength={MAX_POLL_OTHER_LENGTH}
            onChange={(e) => {
              const otherText = e.target.value;
              onChange((current) => ({ ...current, otherText }));
            }}
            placeholder="Your answer"
            rows={2}
            autoFocus
            className="w-full px-3 py-2 field rounded-control resize-none field-sizing-content min-h-16"
          />
        )}
      </div>
    </section>
  );
}

function PollResults({ poll }: { poll: PopulatedPoll }) {
  if (!poll.results) {
    return null;
  }
  if (poll.voterCount === 0) {
    return <Notice>Nobody voted in this poll.</Notice>;
  }
  const results = poll.results;
  return (
    <div className="flex flex-col gap-8">
      {poll.questions.map((question, index) => (
        <QuestionResults
          key={question.id}
          poll={poll}
          question={question}
          index={index}
          results={results[question.id] ?? { tallies: {}, otherResponses: [] }}
        />
      ))}
    </div>
  );
}

function QuestionResults({
  poll,
  question,
  index,
  results,
}: {
  poll: PopulatedPoll;
  question: PollQuestion;
  index: number;
  results: PollQuestionResults;
}) {
  const rows = [
    ...question.options.map((option) => ({
      id: option.id,
      text: option.text,
      count: results.tallies[option.id] ?? 0,
    })),
    ...(question.allowOther
      ? [{ id: OTHER, text: 'Other', count: results.otherResponses.length }]
      : []),
  ];
  const topCount = Math.max(0, ...rows.map((row) => row.count));

  return (
    <section className="flex flex-col gap-4">
      <QuestionHeading poll={poll} question={question} index={index} />
      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          // Percent of voters, so multi-select questions can sum past 100%.
          const percent = Math.round((row.count / poll.voterCount) * 100);
          const isTop = row.count > 0 && row.count === topCount;
          return (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span
                  className={twMerge(
                    'font-medium',
                    isTop ? 'text-ink' : 'text-ink-muted',
                  )}
                >
                  {row.text}
                  {isTop && (
                    <span className="ml-2 text-xs font-semibold text-primary-dark uppercase tracking-wider">
                      Top
                    </span>
                  )}
                </span>
                <span className="text-sm tabular-nums text-ink-muted whitespace-nowrap">
                  {row.count} · {percent}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-ink/8 overflow-hidden">
                <div
                  className={twMerge(
                    'h-full rounded-full transition-[width] duration-700 ease-out',
                    isTop ? 'bg-primary' : 'bg-primary-light',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {question.allowMultiple && (
        <p className="text-xs text-ink-subtle">
          Voters could pick more than one choice, so percentages may add up to
          more than 100%.
        </p>
      )}

      {results.otherResponses.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-2 text-ink-subtle uppercase tracking-widest">
            Other answers
          </h3>
          <ul className="flex flex-col gap-2">
            {results.otherResponses.map((response, responseIndex) => (
              <li
                key={responseIndex}
                className="px-4 py-3 rounded-control bg-white/60 ring-1 ring-white/80 text-ink"
              >
                <MultiLine>{response}</MultiLine>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
