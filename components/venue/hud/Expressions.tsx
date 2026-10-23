'use client';

import { useEffect, useRef, useState } from 'react';
import { showBubble, useAnchorRef } from '../scene/anchors';
import {
  EMOTES,
  express,
  MAX_SAY_LENGTH,
  useExpressions,
  type Expression,
} from '../expressions';

// set by openSelfMenu(…, { typing: true }) so the menu opens with the text
// box focused (the T shortcut)
let typingRequested = false;

/** Open your own emote / chat menu. */
export function openSelfMenu(userId: string, { typing = false } = {}) {
  typingRequested = typing;
  showBubble(userId, { sticky: true });
}

/**
 * What pops up when you tap yourself: emotes to act out and a box to say
 * something. Pinned above your head.
 */
export function SelfMenu({ userId }: { userId: string }) {
  const ref = useAnchorRef(`friend:${userId}`);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (typingRequested) {
      typingRequested = false;
      input.current?.focus();
    }
  }, []);

  const say = () => {
    if (!text.trim()) {
      return;
    }
    express(userId, { kind: 'say', text });
    setText('');
    showBubble(null);
  };

  return (
    <div ref={ref} className="venue-anchor">
      <div
        className="venue-self-menu"
        role="dialog"
        aria-label="Emotes and chat"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            showBubble(null);
          }
        }}
      >
        <div className="venue-emotes">
          {EMOTES.map((emote, i) => (
            <button
              key={emote.id}
              type="button"
              className="venue-emote"
              title={`${emote.label} (${i + 1})`}
              aria-label={emote.label}
              onClick={() => {
                express(userId, { kind: 'emote', emote: emote.id });
                showBubble(null);
              }}
            >
              {emote.emoji}
            </button>
          ))}
        </div>
        <form
          className="venue-say"
          onSubmit={(e) => {
            e.preventDefault();
            say();
          }}
        >
          <input
            ref={input}
            value={text}
            maxLength={MAX_SAY_LENGTH}
            onChange={(e) => setText(e.target.value)}
            placeholder="Say something…"
            aria-label="Say something"
            enterKeyHint="send"
          />
          <button type="submit" disabled={!text.trim()} aria-label="Say it">
            💬
          </button>
        </form>
        <button
          type="button"
          className="venue-self-close"
          aria-label="Close"
          onClick={() => showBubble(null)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** The emotes and speech bubbles currently over people's heads. */
export function ExpressionBubbles() {
  const expressions = useExpressions();
  return (
    <>
      {Array.from(expressions.entries()).map(([userId, expression]) => (
        <ExpressionBubble
          key={`${userId}-${expression.at}`}
          userId={userId}
          expression={expression}
        />
      ))}
    </>
  );
}

function ExpressionBubble({
  userId,
  expression,
}: {
  userId: string;
  expression: Expression;
}) {
  const ref = useAnchorRef(`say:${userId}`);
  return (
    <div ref={ref} className="venue-anchor venue-expression-anchor">
      {expression.kind === 'say' ? (
        <div className="venue-speech" role="status">
          {expression.text}
        </div>
      ) : (
        <div className="venue-emote-pop" aria-hidden>
          {EMOTES.find((emote) => emote.id === expression.emote)?.emoji}
        </div>
      )}
    </div>
  );
}
