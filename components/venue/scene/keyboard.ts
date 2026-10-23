'use client';

import { useEffect, useRef } from 'react';

/**
 * Held movement keys (WASD / arrows) as a screen-relative direction:
 * x is right, y is up. Ignored while typing in a field or with modifiers.
 */

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    element.isContentEditable
  );
}

export function useMovementKeys() {
  // key code -> press id, so a delayed release can't cancel a newer press
  const held = useRef(new Map<string, number>());

  useEffect(() => {
    const keys = held.current;
    let pressId = 0;
    const onDown = (e: KeyboardEvent) => {
      if (!(e.code in KEYS) || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      if (isTyping(e.target)) {
        return;
      }
      // inside a panel the arrows scroll it; WASD still walks
      const inPanel = (e.target as HTMLElement | null)?.closest?.(
        '.venue-sheet-body, .venue-search',
      );
      if (inPanel && e.code.startsWith('Arrow')) {
        return;
      }
      // arrows would otherwise scroll whatever panel has focus
      e.preventDefault();
      if (!keys.has(e.code)) {
        pressId += 1;
        keys.set(e.code, pressId);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const id = keys.get(e.code);
      // keep a quick tap alive for a couple of frames so it still nudges you
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (keys.get(e.code) === id) {
            keys.delete(e.code);
          }
        }),
      );
    };
    const clear = () => keys.clear();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', clear);
    };
  }, []);

  /** Current direction, or null when no movement key is held. */
  return () => {
    let x = 0;
    let y = 0;
    held.current.forEach((_, code) => {
      const [kx, ky] = KEYS[code];
      x += kx;
      y += ky;
    });
    if (x === 0 && y === 0) {
      return null;
    }
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  };
}
