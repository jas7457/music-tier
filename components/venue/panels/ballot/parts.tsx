'use client';

import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import AlbumArt from '@/components/AlbumArt';
import { Avatar } from '@/components/Avatar';
import { getYouTubeIdFromUrl, YouTubePlayer } from '@/components/YouTubePlayer';
import type { PopulatedRound, PopulatedUser } from '@/lib/types';

export type Submission = PopulatedRound['submissions'][number];

export function Chip({
  tone,
  className,
  style,
}: {
  tone: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={twMerge('ballot-chip', `ballot-tone-${tone % 5}`, className)}
      style={style}
    />
  );
}

/** A stack of chips with a count; `ref` target for flying chips. */
export function Pile({
  count,
  pileRef,
}: {
  count: number;
  pileRef?: (el: HTMLElement | null) => void;
}) {
  return (
    <span
      ref={pileRef}
      className={twMerge('ballot-pile', count === 0 && 'is-empty')}
    >
      {Array.from({ length: Math.min(count, 6) }, (_, i) => (
        <Chip
          key={i}
          tone={i}
          className="!absolute"
          style={{ bottom: i * 3 }}
        />
      ))}
      {count > 0 && <span className="ballot-pile-count">{count}</span>}
    </span>
  );
}

export function Face({ user }: { user: PopulatedUser }) {
  return (
    <div className="h-full w-full">
      <Avatar
        user={user}
        size={100}
        isSizePercent
        includeLink={false}
        className="ring-0"
      />
    </div>
  );
}

export function TrackArt({
  submission,
  round,
  size = 56,
}: {
  submission: Submission;
  round: PopulatedRound;
  size?: number;
}) {
  if (!submission.trackInfo.albumImageUrl) {
    return (
      <div
        className="grid shrink-0 place-items-center rounded-media bg-surface-sunken text-xl"
        style={{ width: size, height: size }}
      >
        💿
      </div>
    );
  }
  return (
    <AlbumArt trackInfo={submission.trackInfo} size={size} round={round} />
  );
}

export function TrackInfo({
  submission,
  showSubmitterNote = true,
}: {
  submission: Submission;
  showSubmitterNote?: boolean;
}) {
  return (
    <>
      <div className="ballot-title">{submission.trackInfo.title}</div>
      <div className="ballot-sub">{submission.trackInfo.artists.join(', ')}</div>
      {showSubmitterNote && submission.note && (
        <div className="ballot-submitter-note">{submission.note}</div>
      )}
    </>
  );
}

/** "✍️ note" and "📺 video" toggles with their expandable content. */
export function CardExtras({
  submission,
  note,
  onNoteChange,
  placeholder,
  disabled,
}: {
  submission: Submission;
  /** current note text */
  note: string;
  /** omit for a read-only note */
  onNoteChange?: (note: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const youtubeId = getYouTubeIdFromUrl(submission.youtubeURL || '');
  const editable = !!onNoteChange;
  if (!editable && !note && !youtubeId) {
    return null;
  }
  return (
    <>
      <div className="ballot-tools">
        {(editable || note) && (
          <button
            type="button"
            className={twMerge('ballot-tool', note && 'has-note')}
            aria-expanded={noteOpen}
            onClick={() => setNoteOpen((open) => !open)}
          >
            ✍️ {editable ? (note ? 'note ✓' : 'note') : 'your note'}
          </button>
        )}
        {youtubeId && (
          <button
            type="button"
            className="ballot-tool"
            aria-expanded={videoOpen}
            onClick={() => setVideoOpen((open) => !open)}
          >
            📺 video
          </button>
        )}
      </div>
      {noteOpen &&
        (editable ? (
          <textarea
            className="ballot-note-input field rounded-control"
            value={note}
            disabled={disabled}
            rows={2}
            placeholder={placeholder}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        ) : (
          <blockquote className="ballot-quote whitespace-pre-line">
            {note}
          </blockquote>
        ))}
      {videoOpen && <YouTubePlayer className="mt-2" youtubeId={youtubeId} />}
    </>
  );
}
