// Spatial navigation for the Game Boy screen.
//
// The "cursor" is deliberately NOT DOM focus: focusing a text field on mobile
// pops the keyboard, which we only want when the user actually presses A on it.
// Instead the cursor is a `data-gb-cursor` attribute that the overlay tracks.

export type Direction = 'up' | 'down' | 'left' | 'right';

export const SCREEN_ID = 'gb-lcd';
export const SCROLLER_ID = 'gb-scroll';
const CURSOR_ATTR = 'data-gb-cursor';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'iframe',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
  '[data-gb-focusable]',
].join(',');

const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'email',
  'tel',
  'password',
  'number',
  'date',
  'datetime-local',
  'time',
]);

export function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type);
  return el instanceof HTMLElement && el.isContentEditable;
}

export function getScreen() {
  return document.getElementById(SCREEN_ID);
}

export function getScroller() {
  return document.getElementById(SCROLLER_ID);
}

/** The topmost open overlay (modal, start menu, player…) or the whole screen. */
export function getScope(): HTMLElement | null {
  const screen = getScreen();
  if (!screen) return null;
  const layers = Array.from(
    screen.querySelectorAll<HTMLElement>('[data-gb-layer]'),
  ).filter(isRendered);
  if (layers.length === 0) return screen;
  // Highest explicit priority wins, then last in DOM order.
  return layers.reduce((best, layer) =>
    Number(layer.dataset.gbLayer || 0) >= Number(best.dataset.gbLayer || 0)
      ? layer
      : best,
  );
}

function isRendered(el: HTMLElement) {
  if (el.getClientRects().length === 0) return false;
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.pointerEvents !== 'none';
}

/** The rectangle the user can actually see, for elements inside `scope`. */
export function getViewport(scope: HTMLElement): DOMRect {
  return (getScopeScroller(scope) ?? scope).getBoundingClientRect();
}

/** The element that pages when the D-pad runs out of controls. */
export function getScopeScroller(scope: HTMLElement): HTMLElement | null {
  if (scope.id === SCREEN_ID) return getScroller();
  const marked = scope.querySelector<HTMLElement>('[data-gb-scroll]');
  if (marked) return marked;
  const style = getComputedStyle(scope);
  return /(auto|scroll)/.test(style.overflowY) ? scope : null;
}

function isVisibleInViewport(rect: DOMRect, viewport: DOMRect) {
  return rect.bottom > viewport.top + 2 && rect.top < viewport.bottom - 2;
}

export function getCandidates(scope: HTMLElement): HTMLElement[] {
  const screen = getScreen();
  return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => {
      if (el.closest('[data-gb-skip],[inert],[aria-hidden="true"]')) {
        return false;
      }
      // Don't reach into a closed / background layer from the base scope.
      if (scope === screen) {
        const layer = el.closest('[data-gb-layer]');
        if (layer && layer !== scope) return false;
      }
      // Skip controls nested in another focusable (e.g. a button inside a link)
      // only when the parent is itself a candidate that covers it.
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      const style = getComputedStyle(el);
      if (
        style.visibility === 'hidden' ||
        style.pointerEvents === 'none' ||
        Number(style.opacity) === 0
      ) {
        return false;
      }
      return !isClipped(el, rect);
    },
  );
}

/** True when the element is fully clipped away by an overflow:hidden ancestor. */
function isClipped(el: HTMLElement, rect: DOMRect) {
  let node = el.parentElement;
  while (node && node.id !== SCREEN_ID) {
    const style = getComputedStyle(node);
    if (
      style.overflowX !== 'visible' ||
      style.overflowY !== 'visible' ||
      style.display === 'contents'
    ) {
      if (style.display !== 'contents') {
        const clip = node.getBoundingClientRect();
        const scrollsX = /(auto|scroll)/.test(style.overflowX);
        const scrollsY = /(auto|scroll)/.test(style.overflowY);
        // Scrollable ancestors can bring the element into view, so only a
        // non-scrolling axis clips for good.
        if (!scrollsX && (rect.right <= clip.left || rect.left >= clip.right)) {
          return true;
        }
        if (!scrollsY && (rect.bottom <= clip.top || rect.top >= clip.bottom)) {
          return true;
        }
      }
    }
    node = node.parentElement;
  }
  return false;
}

export function getCursor(): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[${CURSOR_ATTR}]`);
  if (el && !el.isConnected) return null;
  return el;
}

export function setCursor(el: HTMLElement | null, opts?: { scroll?: boolean }) {
  const prev = getCursor();
  if (prev && prev !== el) prev.removeAttribute(CURSOR_ATTR);
  if (el) {
    el.setAttribute(CURSOR_ATTR, '');
    if (opts?.scroll !== false) ensureVisible(el);
  }
  window.dispatchEvent(new CustomEvent('gb:cursor'));
}

/**
 * Scroll every scrollable ancestor (up to the screen) just enough to reveal
 * `el`. We avoid `scrollIntoView` because it also scrolls overflow:hidden
 * ancestors — i.e. it would shove the whole Game Boy around.
 */
export function ensureVisible(el: HTMLElement, margin = 12) {
  let node = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const rect = el.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    if (
      /(auto|scroll)/.test(style.overflowY) &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      const room = box.height - margin * 2;
      if (rect.height > room || rect.top < box.top + margin) {
        node.scrollTop += rect.top - box.top - margin;
      } else if (rect.bottom > box.bottom - margin) {
        node.scrollTop += rect.bottom - box.bottom + margin;
      }
    }
    if (
      /(auto|scroll)/.test(style.overflowX) &&
      node.scrollWidth > node.clientWidth + 1
    ) {
      if (rect.left < box.left + 4) {
        node.scrollLeft += rect.left - box.left - 4;
      } else if (rect.right > box.right - 4) {
        node.scrollLeft += rect.right - box.right + 4;
      }
    }
    if (node.id === SCREEN_ID) break;
    node = node.parentElement;
  }
}

type Box = { top: number; bottom: number; left: number; right: number };

function score(dir: Direction, from: Box, to: DOMRect) {
  const fromCy = (from.top + from.bottom) / 2;
  const toCx = to.left + to.width / 2;
  const fromCx = (from.left + from.right) / 2;
  const toCy = to.top + to.height / 2;

  // Gap between the two boxes on each axis (0 when they overlap).
  const gapX = Math.max(0, to.left - from.right, from.left - to.right);
  const gapY = Math.max(0, to.top - from.bottom, from.top - to.bottom);

  switch (dir) {
    case 'down':
      if (toCy <= fromCy + 1 || to.top < from.top + 1) return null;
      return gapY + gapX * 3;
    case 'up':
      if (toCy >= fromCy - 1 || to.bottom > from.bottom - 1) return null;
      return gapY + gapX * 3;
    case 'right':
      if (toCx <= fromCx + 1 || to.left < from.left + 1) return null;
      // Strongly prefer things on the same row.
      return gapX + gapY * 6 + Math.abs(toCy - fromCy) * 0.1;
    case 'left':
      if (toCx >= fromCx - 1 || to.right > from.right - 1) return null;
      return gapX + gapY * 6 + Math.abs(toCy - fromCy) * 0.1;
  }
}

function findBest(
  dir: Direction,
  from: Box,
  candidates: HTMLElement[],
  exclude: HTMLElement | null,
) {
  let best: { el: HTMLElement; rect: DOMRect; score: number } | null = null;
  for (const el of candidates) {
    if (el === exclude) continue;
    // Moving between a control and its own children is never what you want.
    if (exclude && (el.contains(exclude) || exclude.contains(el))) continue;
    const rect = el.getBoundingClientRect();
    const s = score(dir, from, rect);
    if (s === null) continue;
    // Near-ties go to whichever comes first in reading order (candidates are
    // in DOM order), except when moving up where the nearest row's first
    // item is what you expect too.
    if (!best || s < best.score - 2) best = { el, rect, score: s };
  }
  return best;
}

/**
 * Move the cursor. Returns true when something happened (moved or scrolled).
 *
 * Up/down double as "reading" controls: if the next control is off screen we
 * scroll a page of content first, so long descriptions can be read with the
 * D-pad before the cursor jumps past them.
 */
export function move(dir: Direction): boolean {
  const scope = getScope();
  if (!scope) return false;
  const viewport = getViewport(scope);
  const candidates = getCandidates(scope);
  let cursor = getCursor();
  if (cursor && !scope.contains(cursor)) cursor = null;

  let from: Box;
  if (cursor && isVisibleInViewport(cursor.getBoundingClientRect(), viewport)) {
    from = cursor.getBoundingClientRect();
  } else {
    // No visible cursor: start from the edge of the viewport we're moving away from.
    cursor = null;
    const edge =
      dir === 'down' || dir === 'right'
        ? viewport.top - 1
        : viewport.bottom + 1;
    from =
      dir === 'down' || dir === 'up'
        ? {
            top: edge,
            bottom: edge,
            left: viewport.left,
            right: viewport.right,
          }
        : {
            top: viewport.top,
            bottom: viewport.bottom,
            left: dir === 'right' ? viewport.left - 1 : viewport.right + 1,
            right: dir === 'right' ? viewport.left - 1 : viewport.right + 1,
          };
    if (dir === 'left' || dir === 'right') {
      // Horizontal with nothing selected: grab the first visible control.
      const visible = candidates.find((c) =>
        isVisibleInViewport(c.getBoundingClientRect(), viewport),
      );
      if (visible) {
        setCursor(visible);
        return true;
      }
      return false;
    }
  }

  const best = findBest(dir, from, candidates, cursor);

  if (dir === 'left' || dir === 'right') {
    if (best) {
      setCursor(best.el);
      return true;
    }
    return false;
  }

  const scroller = getScopeScroller(scope);
  const page = Math.max(48, viewport.height * 0.7);

  if (best) {
    const reachable =
      dir === 'down'
        ? best.rect.top < viewport.bottom - 8
        : best.rect.bottom > viewport.top + 8;
    // Also accept it if it's close enough that revealing it won't skip content.
    const nearby =
      dir === 'down'
        ? best.rect.top - viewport.bottom < page * 0.35
        : viewport.top - best.rect.bottom < page * 0.35;
    if (reachable || nearby || !scroller) {
      setCursor(best.el);
      return true;
    }
  }

  // Page through content.
  if (scroller) {
    const before = scroller.scrollTop;
    const step = best
      ? Math.min(
          page,
          dir === 'down'
            ? best.rect.bottom - viewport.bottom + 12
            : viewport.top - best.rect.top + 12,
        )
      : page;
    scroller.scrollTop += dir === 'down' ? step : -step;
    if (scroller.scrollTop !== before) {
      const current = getCursor();
      if (
        current &&
        !isVisibleInViewport(current.getBoundingClientRect(), viewport)
      ) {
        setCursor(null);
      } else {
        window.dispatchEvent(new CustomEvent('gb:cursor'));
      }
      return true;
    }
  }
  return false;
}

/** Put the cursor on the first visible control, if it isn't already somewhere sensible. */
export function resetCursor() {
  const scope = getScope();
  if (!scope) return;
  const cursor = getCursor();
  if (
    cursor &&
    scope.contains(cursor) &&
    getCandidates(scope).includes(cursor)
  ) {
    return;
  }
  const viewport = getViewport(scope);
  const first = getCandidates(scope).find((c) =>
    isVisibleInViewport(c.getBoundingClientRect(), viewport),
  );
  setCursor(first ?? null, { scroll: false });
}

/** A: activate whatever the cursor is on. */
export function activate(): boolean {
  const scope = getScope();
  let el = getCursor();
  if (!el || (scope && !scope.contains(el))) {
    resetCursor();
    el = getCursor();
    if (!el) return false;
  }
  el.animate?.([{ transform: 'translate(1px, 1px)' }, { transform: 'none' }], {
    duration: 120,
  });
  if (isTextEntry(el)) {
    el.focus({ preventScroll: true });
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        // number/date inputs don't support selection ranges
      }
    }
    return true;
  }
  if (el instanceof HTMLSelectElement) {
    el.focus({ preventScroll: true });
    try {
      el.showPicker();
    } catch {
      // Older browsers: focusing is the best we can do.
    }
    return true;
  }
  el.click();
  return true;
}

/**
 * B: close the topmost thing. Returns true if something consumed the press;
 * false means the caller should navigate back.
 */
export function back(): boolean {
  const active = document.activeElement;
  if (isTextEntry(active) || active instanceof HTMLSelectElement) {
    (active as HTMLElement).blur();
    return true;
  }
  const scope = getScope();
  if (scope) {
    const closer = Array.from(
      scope.querySelectorAll<HTMLElement>('[data-gb-back]'),
    ).find((el) => el.getClientRects().length > 0);
    if (closer) {
      closer.click();
      return true;
    }
  }
  return false;
}
