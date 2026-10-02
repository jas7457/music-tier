'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import { HapticButton } from '@/components/HapticButton';
import { ToggleButton } from '@/components/ToggleButton';
import { useToast } from '@/lib/ToastContext';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_POLL_OPTION_LENGTH,
  MAX_POLL_OPTIONS,
  MAX_POLL_QUESTIONS,
  MAX_POLL_TITLE_LENGTH,
  POLL_DURATION_OPTIONS,
} from '@/lib/utils/constants';

type DurationHours = (typeof POLL_DURATION_OPTIONS)[number]['hours'];

type DraftChoice = { key: number; text: string };
type DraftQuestion = {
  key: number;
  text: string;
  choices: DraftChoice[];
  allowMultiple: boolean;
  allowOther: boolean;
};

let nextKey = 0;
const newChoice = (): DraftChoice => ({ key: nextKey++, text: '' });
const newQuestion = (): DraftQuestion => ({
  key: nextKey++,
  text: '',
  choices: [newChoice(), newChoice()],
  allowMultiple: false,
  allowOther: false,
});

function isQuestionReady(question: DraftQuestion, needsText: boolean) {
  const filled = question.choices.filter((choice) => choice.text.trim());
  return (
    (!needsText || question.text.trim().length > 0) &&
    filled.length + (question.allowOther ? 1 : 0) >= 2
  );
}

export function CreatePoll() {
  const router = useRouter();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [
    newQuestion(),
  ]);
  const [isCreatorAnonymous, setIsCreatorAnonymous] = useState(false);
  const [durationHours, setDurationHours] = useState<DurationHours>(
    POLL_DURATION_OPTIONS[0].hours,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // With one question the title is the question, so it needs no text of its
  // own. Once there are several, each one needs its own text.
  const isMultiQuestion = questions.length > 1;
  const canSubmit =
    title.trim().length > 0 &&
    questions.every((question) => isQuestionReady(question, isMultiQuestion)) &&
    !isSubmitting;

  const updateQuestion = (
    key: number,
    update: (question: DraftQuestion) => DraftQuestion,
  ) => {
    setQuestions((current) =>
      current.map((question) =>
        question.key === key ? update(question) : question,
      ),
    );
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setQuestions([newQuestion()]);
    setIsCreatorAnonymous(false);
    setDurationHours(POLL_DURATION_OPTIONS[0].hours);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          questions: questions.map((question) => ({
            text: isMultiQuestion ? question.text : '',
            options: question.choices
              .map((choice) => choice.text)
              .filter((text) => text.trim()),
            allowMultiple: question.allowMultiple,
            allowOther: question.allowOther,
          })),
          isCreatorAnonymous,
          durationHours,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create poll');
      }
      toast.show({ variant: 'success', message: 'Poll created!' });
      reset();
      setIsOpen(false);
      router.push(`/polls/${data.pollId}`);
    } catch (error) {
      toast.show({
        variant: 'error',
        message: unknownToErrorString(error, 'Failed to create poll'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Card className="p-6 text-center border-2 border-dashed border-primary-light bg-primary-lightest/60 ring-0 shadow-none transition-colors hover:bg-primary-lightest">
        <p className="text-ink-muted mb-3">
          Have an idea for the site, or just want to know what everyone thinks?
        </p>
        <HapticButton
          onClick={() => setIsOpen(true)}
          className="bg-primary-dark hover:bg-primary-darker text-white font-semibold py-2.5 px-6 rounded-control shadow-soft hover:shadow-float transition-all"
        >
          Create a Poll
        </HapticButton>
      </Card>
    );
  }

  return (
    <Card className="p-6 ring-1 ring-primary/20 bg-primary-lightest/60">
      <h2 className="text-xl font-bold mb-4 text-primary-darkest">New Poll</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="pollTitle"
            className="block text-sm font-medium text-ink-muted mb-1"
          >
            {isMultiQuestion ? 'Title' : 'Question'}
          </label>
          <input
            id="pollTitle"
            type="text"
            value={title}
            maxLength={MAX_POLL_TITLE_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isMultiQuestion
                ? 'Ideas for next season'
                : 'Should we add dark mode?'
            }
            className="w-full px-3 py-2 field rounded-control"
            autoFocus
          />
        </div>

        <div>
          <label
            htmlFor="pollDescription"
            className="block text-sm font-medium text-ink-muted mb-1"
          >
            Details <span className="text-ink-subtle">(optional)</span>
          </label>
          <textarea
            id="pollDescription"
            value={description}
            maxLength={MAX_DESCRIPTION_LENGTH}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Any extra context people should know"
            className="w-full px-3 py-2 field rounded-control resize-none field-sizing-content min-h-16"
          />
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.key}
              question={question}
              index={index}
              isMultiQuestion={isMultiQuestion}
              onChange={(update) => updateQuestion(question.key, update)}
              onRemove={() =>
                setQuestions((current) =>
                  current.filter((q) => q.key !== question.key),
                )
              }
            />
          ))}
          {questions.length < MAX_POLL_QUESTIONS && (
            <HapticButton
              type="button"
              onClick={() =>
                setQuestions((current) => [...current, newQuestion()])
              }
              className="w-full py-2.5 rounded-control border-2 border-dashed border-primary-light text-sm font-semibold text-primary-dark hover:text-primary-darker hover:bg-white/50"
            >
              + Add another question
            </HapticButton>
          )}
        </div>

        <Checkbox
          checked={isCreatorAnonymous}
          onChange={setIsCreatorAnonymous}
          label="Post anonymously"
          description="Hide your name from this poll. Votes are always anonymous."
        />

        <div>
          <div className="block text-sm font-medium text-ink-muted mb-1">
            Poll length
          </div>
          <div className="inline-flex gap-1 p-1 rounded-control glass">
            {POLL_DURATION_OPTIONS.map((option) => (
              <ToggleButton
                key={option.hours}
                selected={durationHours === option.hours}
                onClick={() => setDurationHours(option.hours)}
              >
                {option.label}
              </ToggleButton>
            ))}
          </div>
          <p className="text-sm text-ink-subtle mt-1">
            Everyone gets notified now, and again with the results when the poll
            closes or everyone has voted.
          </p>
        </div>

        <div className="flex gap-3">
          <HapticButton
            type="submit"
            disabled={!canSubmit}
            className="flex-1 bg-primary-dark hover:bg-primary-darker text-white font-semibold py-2.5 px-4 rounded-control shadow-soft hover:shadow-float transition-all disabled:bg-ink-subtle disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Poll'}
          </HapticButton>
          <HapticButton
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              reset();
              setIsOpen(false);
            }}
            className="flex-1 bg-white/70 ring-1 ring-ink/15 hover:bg-white hover:ring-ink/25 text-ink font-semibold py-2.5 px-4 rounded-control transition-all disabled:cursor-not-allowed"
          >
            Cancel
          </HapticButton>
        </div>
      </form>
    </Card>
  );
}

function QuestionEditor({
  question,
  index,
  isMultiQuestion,
  onChange,
  onRemove,
}: {
  question: DraftQuestion;
  index: number;
  isMultiQuestion: boolean;
  onChange: (update: (question: DraftQuestion) => DraftQuestion) => void;
  onRemove: () => void;
}) {
  const textId = `pollQuestion-${question.key}`;

  const body = (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="block text-sm font-medium text-ink-muted mb-1">
          Choices
        </legend>
        <div className="flex flex-col gap-2">
          {question.choices.map((choice, choiceIndex) => (
            <div key={choice.key} className="flex gap-2">
              <input
                type="text"
                value={choice.text}
                maxLength={MAX_POLL_OPTION_LENGTH}
                aria-label={`Choice ${choiceIndex + 1}`}
                placeholder={`Choice ${choiceIndex + 1}`}
                onChange={(e) => {
                  const text = e.target.value;
                  onChange((q) => ({
                    ...q,
                    choices: q.choices.map((c) =>
                      c.key === choice.key ? { ...c, text } : c,
                    ),
                  }));
                }}
                className="flex-1 min-w-0 px-3 py-2 field rounded-control"
              />
              {question.choices.length > 2 && (
                <RemoveButton
                  title="Remove choice"
                  onClick={() =>
                    onChange((q) => ({
                      ...q,
                      choices: q.choices.filter((c) => c.key !== choice.key),
                    }))
                  }
                />
              )}
            </div>
          ))}
          {question.allowOther && (
            <div className="px-3 py-2 rounded-control border border-dashed border-line-strong text-ink-subtle text-sm italic">
              Other (voters write their own answer)
            </div>
          )}
        </div>
        {question.choices.length < MAX_POLL_OPTIONS && (
          <HapticButton
            type="button"
            onClick={() =>
              onChange((q) => ({ ...q, choices: [...q.choices, newChoice()] }))
            }
            className="mt-2 text-sm font-semibold text-primary-dark hover:text-primary-darker"
          >
            + Add choice
          </HapticButton>
        )}
      </fieldset>

      <div className="flex flex-col gap-3">
        <Checkbox
          checked={question.allowMultiple}
          onChange={(allowMultiple) =>
            onChange((q) => ({ ...q, allowMultiple }))
          }
          label="Allow multiple choices"
          description="Voters can pick more than one answer"
        />
        <Checkbox
          checked={question.allowOther}
          onChange={(allowOther) => onChange((q) => ({ ...q, allowOther }))}
          label='Add an "Other" choice'
          description="Voters can write in their own answer"
        />
      </div>
    </div>
  );

  // A lone question is just part of the form; the title above is its text.
  if (!isMultiQuestion) {
    return body;
  }

  return (
    <div className="p-4 rounded-tile bg-white/60 ring-1 ring-white/80 flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label
            htmlFor={textId}
            className="block text-sm font-semibold text-ink"
          >
            Question {index + 1}
          </label>
          <RemoveButton title="Remove question" onClick={onRemove} />
        </div>
        <input
          id={textId}
          type="text"
          value={question.text}
          maxLength={MAX_POLL_TITLE_LENGTH}
          onChange={(e) => {
            const text = e.target.value;
            onChange((q) => ({ ...q, text }));
          }}
          placeholder="What do you want to ask?"
          className="w-full px-3 py-2 field rounded-control"
        />
      </div>
      {body}
    </div>
  );
}

function RemoveButton({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  return (
    <HapticButton
      type="button"
      title={title}
      onClick={onClick}
      className="shrink-0 w-10 h-10 rounded-control text-ink-subtle hover:text-red-600 hover:bg-white/60 flex items-center justify-center"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </HapticButton>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 shrink-0 text-primary-dark rounded focus:ring-primary mt-0.5"
      />
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm text-ink-muted">{description}</div>
      </div>
    </label>
  );
}
