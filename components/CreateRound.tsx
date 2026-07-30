'use client';

import { useState } from 'react';
import Card from './Card';
import { useData } from '@/lib/DataContext';
import { useToast } from '@/lib/ToastContext';
import { unknownToErrorString } from '@/lib/utils/unknownToErrorString';
import { HapticButton } from './HapticButton';
import { MAX_DESCRIPTION_LENGTH } from '@/lib/utils/constants';

type CreateRoundProps = {
  leagueId: string;
  isBonusRound: boolean;
  isKickoffRound: boolean;
};

export function CreateRound({
  leagueId,
  isBonusRound,
  isKickoffRound,
}: CreateRoundProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshData } = useData();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/leagues/${leagueId}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          isBonusRound,
          isKickoffRound,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create round');
      }

      // Reset form and close
      setTitle('');
      setDescription('');
      setIsOpen(false);
    } catch (err) {
      const message = unknownToErrorString(err, 'Failed to create round');
      toast.show({
        title: 'Failed to create round',
        message,
        variant: 'error',
      });
      setError(message);
    } finally {
      setIsSubmitting(false);
      refreshData('manual');
    }
  };

  const { paragraphText, buttonText } = (() => {
    if (isBonusRound) {
      return {
        paragraphText: 'Congrats! You have a bonus round.',
        buttonText: 'Create Your Bonus Round',
      };
    }
    if (isKickoffRound) {
      return {
        paragraphText: 'Congrats! You have a kickoff round.',
        buttonText: 'Create Your Kickoff Round',
      };
    }
    return {
      paragraphText: "You haven't created your round yet.",
      buttonText: 'Create Your Round',
    };
  })();

  if (!isOpen) {
    return (
      <Card className="p-8 text-center border-2 border-dashed border-primary-light bg-primary-lightest/60 ring-0 shadow-none transition-colors hover:bg-primary-lightest">
        <p className="text-ink-muted mb-3">{paragraphText}</p>
        <HapticButton
          onClick={() => setIsOpen(true)}
          className="bg-primary-dark hover:bg-primary-darker text-white font-semibold py-2.5 px-6 rounded-control shadow-soft hover:shadow-float transition-all"
        >
          {buttonText}
        </HapticButton>
      </Card>
    );
  }

  return (
    <Card className="p-6 ring-1 ring-primary/20 bg-primary-lightest/60">
      <h3 className="text-xl font-bold mb-4 text-primary-darkest">
        {buttonText}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-ink-muted mb-1"
          >
            Round Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g., 90s Hip Hop, Summer Vibes, etc."
            className="w-full px-3 py-2 field rounded-control"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-ink-muted mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Describe the theme or criteria for this round..."
            className="w-full px-3 py-2 field rounded-control resize-none field-sizing-content"
            disabled={isSubmitting}
          />
          <p className="text-sm text-ink-subtle mt-1">
            {description.length}/{MAX_DESCRIPTION_LENGTH} characters
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <HapticButton
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-primary-dark hover:bg-primary-darker text-white font-semibold py-2.5 px-4 rounded-control shadow-soft hover:shadow-float transition-all disabled:bg-ink-subtle disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Round'}
          </HapticButton>
          <HapticButton
            type="button"
            onClick={() => {
              setIsOpen(false);
              setTitle('');
              setDescription('');
              setError(null);
            }}
            disabled={isSubmitting}
            className="flex-1 bg-white/70 ring-1 ring-ink/15 hover:bg-white hover:ring-ink/25 text-ink font-semibold py-2.5 px-4 rounded-control transition-all disabled:cursor-not-allowed"
          >
            Cancel
          </HapticButton>
        </div>
      </form>
    </Card>
  );
}
