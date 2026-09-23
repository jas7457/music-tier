'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  activate,
  back,
  Direction,
  getCursor,
  getScope,
  isTextEntry,
  move,
  resetCursor,
  SCREEN_ID,
  SCROLLER_ID,
  setCursor,
} from '@/lib/gameboy/navigation';
import { blip, buzz } from '@/lib/gameboy/sound';
import { CursorOverlay } from './CursorOverlay';
import { StartMenu } from './StartMenu';

type Button = Direction | 'a' | 'b' | 'start' | 'select';

const KEY_FOR_DIRECTION: Record<Direction, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

const DIRECTION_FOR_KEY: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/** Keyboard events we dispatched ourselves from the on-screen D-pad. */
const synthetic = new WeakSet<Event>();

/** Where B goes when there's no in-app history to pop. */
function parentPath(pathname: string) {
  const round = pathname.match(/^(\/leagues\/[^/]+)\/rounds\/[^/]+/);
  if (round) return round[1];
  return pathname === '/' ? null : '/';
}

export function GameBoy({
  children,
  hasPlayer,
  onSelect,
  overlay,
}: {
  children: React.ReactNode;
  hasPlayer: boolean;
  onSelect: () => void;
  /** Things positioned over the screen content (music player, etc.). */
  overlay?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pressed, setPressed] = useState<Button | null>(null);
  const historyDepth = useRef(0);
  const lastPath = useRef(pathname);

  // Track in-app navigations so B can pop history instead of leaving the site.
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      historyDepth.current += 1;
      document.getElementById(SCROLLER_ID)?.scrollTo({ top: 0 });
      setCursor(null);
    }
    const t = setTimeout(resetCursor, 120);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const onPop = () => {
      historyDepth.current = Math.max(0, historyDepth.current - 2);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Keep the cursor valid as overlays open/close and content re-renders.
  useEffect(() => {
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const cursor = getCursor();
        const scope = getScope();
        if (!cursor || !scope || !scope.contains(cursor)) resetCursor();
      }, 80);
    });
    observer.observe(screen, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-gb-layer'],
    });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Tapping something on the screen moves the cursor there too.
  useEffect(() => {
    const screen = document.getElementById(SCREEN_ID);
    if (!screen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>(
        'a[href],button,input,select,textarea,summary,[role="button"],[tabindex]:not([tabindex="-1"]),[data-gb-focusable]',
      );
      if (target && !target.closest('[data-gb-skip]')) {
        setCursor(target, { scroll: false });
      }
    };
    screen.addEventListener('pointerdown', onPointerDown);
    return () => screen.removeEventListener('pointerdown', onPointerDown);
  }, []);

  // The single input pipeline. On-screen buttons dispatch real KeyboardEvents
  // so existing keyboard handlers (playback, carousels) get first dibs; if
  // they call preventDefault, we stand down.
  const stateRef = useRef({ menuOpen, pathname, hasPlayer, onSelect });
  useEffect(() => {
    stateRef.current = { menuOpen, pathname, hasPlayer, onSelect };
  });

  useEffect(() => {
    const goBack = () => {
      if (back()) return true;
      if (historyDepth.current > 0) {
        historyDepth.current -= 1;
        router.back();
        return true;
      }
      const parent = parentPath(stateRef.current.pathname);
      if (parent) {
        router.push(parent);
        return true;
      }
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const isSynthetic = synthetic.has(e);
      const active = document.activeElement;
      const typing = isTextEntry(active) || active instanceof HTMLSelectElement;

      let button: Button | null = null;
      const dir = DIRECTION_FOR_KEY[e.key];
      if (dir) button = dir;
      else if (e.key === 'x' || e.key === 'X' || e.key === 'Enter')
        button = 'a';
      else if (
        e.key === 'z' ||
        e.key === 'Z' ||
        e.key === 'Escape' ||
        e.key === 'Backspace'
      )
        button = 'b';
      else if (e.key === 's' || e.key === 'S') button = 'start';
      else if (e.key === 'Shift') button = 'select';
      if (!button) return;

      if (typing && !isSynthetic) {
        // Let the keyboard type. Only Escape and up/down in a single-line
        // field escape out of it.
        const singleLine = active instanceof HTMLInputElement;
        if (button === 'b' && e.key === 'Escape') {
          (active as HTMLElement).blur();
          e.preventDefault();
          blip('back');
          return;
        }
        if (!(singleLine && (button === 'up' || button === 'down'))) return;
        (active as HTMLElement).blur();
      } else if (typing && isSynthetic) {
        if (button === 'b') {
          (active as HTMLElement).blur();
          blip('back');
          return;
        }
        if (button !== 'a') (active as HTMLElement).blur();
      }

      e.preventDefault();
      const state = stateRef.current;
      switch (button) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
          if (move(button)) blip('move');
          else blip('bump');
          return;
        case 'a':
          if (activate()) blip('select');
          else blip('bump');
          return;
        case 'b':
          if (state.menuOpen) {
            setMenuOpen(false);
            blip('back');
            return;
          }
          if (goBack()) blip('back');
          else blip('bump');
          return;
        case 'start':
          setMenuOpen((open) => !open);
          blip('menu');
          return;
        case 'select':
          if (state.hasPlayer) {
            setMenuOpen(false);
            state.onSelect();
            blip('menu');
          } else {
            blip('bump');
          }
          return;
      }
    };

    // Bubble phase on window = after every document-level handler.
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  const press = (button: Button) => {
    buzz();
    const key =
      button === 'a'
        ? 'x'
        : button === 'b'
          ? 'z'
          : button === 'start'
            ? 's'
            : button === 'select'
              ? 'Shift'
              : KEY_FOR_DIRECTION[button];
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    synthetic.add(event);
    // Dispatch from the document so document-level listeners see it, but not
    // from a focused input (we don't want to type into it).
    document.dispatchEvent(event);
  };

  // D-pad auto-repeat while held.
  const repeat = useRef<{ timer?: ReturnType<typeof setTimeout> }>({});
  const stopRepeat = () => {
    clearTimeout(repeat.current.timer);
    setPressed(null);
  };
  const startDirection = (dir: Direction) => {
    stopRepeat();
    setPressed(dir);
    press(dir);
    const loop = (delay: number) => {
      repeat.current.timer = setTimeout(() => {
        press(dir);
        loop(110);
      }, delay);
    };
    loop(380);
  };

  const dpadProps = (dir: Direction) => ({
    'aria-label': dir,
    className: `gb-dpad-arm gb-dpad-${dir}`,
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      startDirection(dir);
    },
    onPointerUp: stopRepeat,
    onPointerCancel: stopRepeat,
    onLostPointerCapture: stopRepeat,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  // Face buttons act on click (after pointerup) so they count as a user
  // gesture on iOS — needed for opening the keyboard, popups and audio.
  const faceProps = (button: 'a' | 'b' | 'start' | 'select') => ({
    'aria-label': button,
    'data-pressed': pressed === button || undefined,
    onPointerDown: (e: React.PointerEvent) => {
      // Keep focus where it is (e.g. in a text field) when tapping chrome.
      e.preventDefault();
    },
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => press(button),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="gb-stage">
      <div className="gb-case">
        <div className="gb-topline" aria-hidden="true">
          <span>◁ OFF·ON ▷</span>
        </div>

        <div className="gb-bezel">
          <div className="gb-bezel-label" aria-hidden="true">
            <span className="gb-bezel-line" />
            <span className="gb-bezel-text">DOT MATRIX WITH STEREO SOUND</span>
            <span className="gb-bezel-line" />
          </div>
          <div className="gb-battery" aria-hidden="true">
            <span className="gb-led" />
            <span>BATTERY</span>
          </div>

          <div className="gb-screen">
            <div id={SCREEN_ID} className="gb-lcd">
              <div id={SCROLLER_ID} className="gb-scroll">
                {children}
              </div>
              {overlay}
              {menuOpen && (
                <StartMenu
                  onClose={() => setMenuOpen(false)}
                  hasPlayer={hasPlayer}
                  onOpenPlayer={onSelect}
                />
              )}
              <CursorOverlay />
            </div>
            <div className="gb-tint" aria-hidden="true" />
          </div>
        </div>

        <div className="gb-brand" aria-hidden="true">
          <span className="gb-brand-small">Playlist</span>
          <span className="gb-brand-big">PARTY</span>
          <span className="gb-brand-tm">™</span>
        </div>

        <div className="gb-controls">
          <div className="gb-dpad" data-dir={pressed ?? undefined}>
            <button type="button" {...dpadProps('up')} />
            <button type="button" {...dpadProps('left')} />
            <span className="gb-dpad-center" />
            <button type="button" {...dpadProps('right')} />
            <button type="button" {...dpadProps('down')} />
          </div>

          <div className="gb-ab">
            <div className="gb-ab-slot gb-ab-b">
              <button
                type="button"
                className="gb-round-btn"
                {...faceProps('b')}
              />
              <span className="gb-btn-label">B</span>
            </div>
            <div className="gb-ab-slot gb-ab-a">
              <button
                type="button"
                className="gb-round-btn"
                {...faceProps('a')}
              />
              <span className="gb-btn-label">A</span>
            </div>
          </div>

          <div className="gb-pills">
            <div className="gb-pill-slot">
              <button
                type="button"
                className="gb-pill-btn"
                {...faceProps('select')}
              />
              <span className="gb-btn-label">SELECT</span>
            </div>
            <div className="gb-pill-slot">
              <button
                type="button"
                className="gb-pill-btn"
                {...faceProps('start')}
              />
              <span className="gb-btn-label">START</span>
            </div>
          </div>

          <div className="gb-speaker" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>
      </div>

      <p className="gb-legend" aria-hidden="true">
        ←↑↓→ move · X / Enter = A · Z / Esc = B · S = Start · Shift = Select
      </p>
    </div>
  );
}
