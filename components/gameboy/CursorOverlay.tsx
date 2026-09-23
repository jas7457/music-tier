'use client';

import { useEffect, useRef } from 'react';
import {
  getCursor,
  getScope,
  getViewport,
  SCREEN_ID,
} from '@/lib/gameboy/navigation';

/**
 * Draws the selection cursor: a blinking ▶ plus corner brackets. Rendered as an
 * overlay (not an outline) so it can't be clipped by overflow:hidden cards and
 * doesn't shift layout. Position is tracked every frame while a cursor exists
 * because the target can move under us (scrolling, animations, reflow).
 */
export function CursorOverlay() {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    let last = '';

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const box = boxRef.current;
      const screen = document.getElementById(SCREEN_ID);
      if (!box || !screen) return;
      const el = getCursor();
      const scope = getScope();
      if (!el || !scope || !scope.contains(el)) {
        if (last !== 'hidden') {
          box.style.display = 'none';
          last = 'hidden';
        }
        return;
      }
      const s = screen.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const v = getViewport(scope);
      // Hide when scrolled out of the visible area.
      if (r.bottom < v.top || r.top > v.bottom) {
        if (last !== 'hidden') {
          box.style.display = 'none';
          last = 'hidden';
        }
        return;
      }
      const top = Math.round(r.top - s.top) - 2;
      const left = Math.round(r.left - s.left) - 2;
      const width = Math.round(r.width) + 4;
      const height = Math.round(r.height) + 4;
      // Clip to the scroll viewport so brackets never draw over the chrome.
      const clipTop = Math.max(0, v.top - r.top + 2);
      const clipBottom = Math.max(0, r.bottom - v.bottom + 2);
      const style =
        el.closest<HTMLElement>('[data-gb-cursor-style]')?.dataset
          .gbCursorStyle ?? '';
      const key = `${top},${left},${width},${height},${clipTop},${clipBottom},${style}`;
      if (key === last) return;
      last = key;
      box.style.display = 'block';
      box.style.transform = `translate(${left}px, ${top}px)`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
      box.style.clipPath = `inset(${clipTop}px -20px ${clipBottom}px -20px)`;
      box.dataset.style = style;
      box.dataset.edge =
        style === 'arrow' || r.left - s.left < 14 ? 'inside' : 'outside';
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={boxRef} className="gb-cursor" aria-hidden="true">
      <span className="gb-cursor-corner gb-cursor-tl" />
      <span className="gb-cursor-corner gb-cursor-tr" />
      <span className="gb-cursor-corner gb-cursor-bl" />
      <span className="gb-cursor-corner gb-cursor-br" />
      <span className="gb-cursor-arrow" />
    </div>
  );
}
