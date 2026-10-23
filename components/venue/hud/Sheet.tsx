'use client';

import { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

export type SheetSize = 'half' | 'full';

/**
 * The panel a station opens. A draggable bottom sheet on phones (half or
 * full height), a side drawer on wider screens. Reports how much of the
 * screen it covers so the camera can keep the station in view.
 */
export function Sheet({
  open,
  isWide,
  size,
  onSizeChange,
  onClose,
  onCoverChange,
  title,
  emoji,
  color,
  onBack,
  children,
}: {
  open: boolean;
  isWide: boolean;
  size: SheetSize;
  onSizeChange: (size: SheetSize) => void;
  onClose: () => void;
  onCoverChange: (cover: { bottom: number; right: number }) => void;
  title: string;
  emoji: string;
  color: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ y: number; time: number } | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const height = (() => {
    if (!viewportHeight) {
      return 0;
    }
    return size === 'full'
      ? viewportHeight - 56
      : Math.round(viewportHeight * 0.58);
  })();

  // tell the camera what's covered
  useEffect(() => {
    if (!open) {
      onCoverChange({ bottom: 0, right: 0 });
      return;
    }
    if (isWide) {
      onCoverChange({ bottom: 0, right: 460 });
    } else {
      onCoverChange({ bottom: height, right: 0 });
    }
  }, [open, isWide, height, onCoverChange]);

  // new content starts at the top
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [title]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const header = (
    <div
      className="venue-sheet-header"
      style={{ '--station-color': color } as React.CSSProperties}
      onPointerDown={(e) => {
        if (isWide) {
          return;
        }
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        dragStart.current = { y: e.clientY, time: Date.now() };
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragStart.current) {
          return;
        }
        setDragOffset(e.clientY - dragStart.current.y);
      }}
      onPointerUp={(e) => {
        const start = dragStart.current;
        dragStart.current = null;
        setDragging(false);
        if (!start) {
          return;
        }
        const distance = e.clientY - start.y;
        const velocity = distance / Math.max(1, Date.now() - start.time);
        setDragOffset(0);
        if (Math.abs(distance) < 6) {
          // a tap on the handle toggles the size
          onSizeChange(size === 'full' ? 'half' : 'full');
          return;
        }
        if (distance > 120 || velocity > 0.8) {
          if (size === 'full' && distance < viewportHeight * 0.45) {
            onSizeChange('half');
          } else {
            onClose();
          }
          return;
        }
        if (distance < -60 || velocity < -0.6) {
          onSizeChange('full');
        }
      }}
      onPointerCancel={() => {
        dragStart.current = null;
        setDragging(false);
        setDragOffset(0);
      }}
    >
      {!isWide && <div className="venue-sheet-grip" aria-hidden />}
      <div className="flex items-center gap-2 min-w-0">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="venue-icon-button"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : (
          <span className="venue-sheet-emoji" aria-hidden>
            {emoji}
          </span>
        )}
        <h2 className="venue-sheet-title truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-1">
        {!isWide && (
          <button
            type="button"
            onClick={() => onSizeChange(size === 'full' ? 'half' : 'full')}
            className="venue-icon-button"
            aria-label={size === 'full' ? 'Shrink panel' : 'Expand panel'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: size === 'full' ? 'rotate(180deg)' : undefined }}>
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="venue-icon-button"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <section
      aria-hidden={!open}
      aria-label={title}
      className={twMerge(
        'venue-sheet',
        isWide ? 'venue-sheet-wide' : 'venue-sheet-narrow',
        open && 'is-open',
      )}
      style={
        isWide
          ? undefined
          : {
              height: height || '58vh',
              transform: open
                ? `translateY(${Math.max(0, dragOffset)}px)`
                : 'translateY(105%)',
              transition: dragging ? 'none' : undefined,
            }
      }
      inert={!open}
    >
      {header}
      <div ref={scrollRef} className="venue-sheet-body">
        {children}
      </div>
    </section>
  );
}
