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
      <Card className="p-6 text-center">
        <p className="mb-3">{paragraphText}</p>
        <HapticButton
          onClick={() => setIsOpen(true)}
          className="w98-btn w98-btn-default"
        >
          {buttonText}
        </HapticButton>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <h3 className="text-lg mb-3">{buttonText}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm mb-1">
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
            className="w98-field"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Describe the theme or criteria for this round..."
            className="w98-field"
            disabled={isSubmitting}
          />
          <p className="text-sm text-ink-subtle mt-1">
            {description.length}/{MAX_DESCRIPTION_LENGTH} characters
          </p>
        </div>

        {error && (
          <div className="w98-sunken-thin bg-w98-face p-2 text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <HapticButton
            type="submit"
            disabled={isSubmitting}
            className="w98-btn w98-btn-default grow"
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
            className="w98-btn grow"
          >
            Cancel
          </HapticButton>
        </div>
      </form>
    </Card>
  );
}
