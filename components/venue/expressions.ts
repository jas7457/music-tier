'use client';

import { useSyncExternalStore } from 'react';

/**
 * Emotes and speech bubbles over people's heads.
 *
 * Everything goes through express(), which is the one place to hook up
 * broadcasting to other players later; for now it only shows locally.
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

/** Show an emote or a line of speech over someone's head. */
export function express(
  userId: string,
  expression:
    | { kind: 'emote'; emote: EmoteId }
    | { kind: 'say'; text: string },
) {
  const at = Date.now();
  const value: Expression =
    expression.kind === 'say'
      ? { kind: 'say', text: expression.text.trim().slice(0, MAX_SAY_LENGTH), at }
      : { kind: 'emote', emote: expression.emote, at };
  if (value.kind === 'say' && !value.text) {
    return;
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
