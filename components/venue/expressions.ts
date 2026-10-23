'use client';

import { useSyncExternalStore } from 'react';

/**
 * Emotes and speech bubbles over people's heads.
 *
 * express() shows yours and sends it to everyone else in the venue (see
 * live.ts); receiveExpression() shows someone else's.
 */

export const EMOTES = [
  { id: 'wave', emoji: '👋', label: 'Wave', move: 'wave' },
  { id: 'dance', emoji: '💃', label: 'Dance', move: 'spin' },
  { id: 'fire', emoji: '🔥', label: 'Fire', move: 'hop' },
  { id: 'clap', emoji: '👏', label: 'Clap', move: 'clap' },
  { id: 'lol', emoji: '😂', label: 'LOL', move: 'hop' },
  { id: 'party', emoji: '🎉', label: 'Party', move: 'spin' },
] as const;

export type EmoteId = (typeof EMOTES)[number]['id'];
export type Move = (typeof EMOTES)[number]['move'];

export const MAX_SAY_LENGTH = 80;

export type Expression =
  | { kind: 'emote'; emote: EmoteId; at: number }
  | { kind: 'say'; text: string; at: number };

// how long each shows for
export const EMOTE_MS = 3000;
export const SAY_MS = 5200;

const active = new Map<string, Expression>();
const listeners = new Set<() => void>();
let snapshot: ReadonlyMap<string, Expression> = new Map();

function publish() {
  snapshot = new Map(active);
  listeners.forEach((listener) => listener());
}

export type OutgoingExpression =
  | { kind: 'emote'; emote: EmoteId }
  | { kind: 'say'; text: string };

let broadcaster: ((expression: OutgoingExpression) => void) | null = null;

/** Set by live.ts while you're connected to the venue. */
export function setExpressionBroadcaster(
  next: ((expression: OutgoingExpression) => void) | null,
) {
  broadcaster = next;
}

/** Your emote or line of speech: shown here and sent to everyone else. */
export function express(userId: string, expression: OutgoingExpression) {
  const shown = show(userId, expression);
  if (shown) {
    broadcaster?.(
      shown.kind === 'say'
        ? { kind: 'say', text: shown.text }
        : { kind: 'emote', emote: shown.emote },
    );
  }
}

/** Someone else's emote or speech, as it arrived (so: check everything). */
export function receiveExpression(userId: string, data: unknown) {
  const value = data as { kind?: unknown; emote?: unknown; text?: unknown };
  if (value?.kind === 'emote' && EMOTES.some((emote) => emote.id === value.emote)) {
    show(userId, { kind: 'emote', emote: value.emote as EmoteId });
  } else if (value?.kind === 'say' && typeof value.text === 'string') {
    show(userId, { kind: 'say', text: value.text });
  }
}

function show(userId: string, expression: OutgoingExpression): Expression | null {
  const at = Date.now();
  const value: Expression =
    expression.kind === 'say'
      ? { kind: 'say', text: expression.text.trim().slice(0, MAX_SAY_LENGTH), at }
      : { kind: 'emote', emote: expression.emote, at };
  if (value.kind === 'say' && !value.text) {
    return null;
  }
  active.set(userId, value);
  publish();
  setTimeout(
    () => {
      // only clear it if nothing newer replaced it
      if (active.get(userId)?.at === at) {
        active.delete(userId);
        publish();
      }
    },
    value.kind === 'say' ? SAY_MS : EMOTE_MS,
  );
  return value;
}

/** Read without subscribing (for the 3D scene's animation loop). */
export function getExpression(userId: string): Expression | undefined {
  return active.get(userId);
}

export function getMove(expression: Expression | undefined): Move | null {
  if (expression?.kind !== 'emote') {
    return null;
  }
  return EMOTES.find((emote) => emote.id === expression.emote)?.move ?? null;
}

export function useExpressions() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );
}
