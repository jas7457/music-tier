'use client';

import { createPortal } from 'react-dom';

/**
 * Renders children directly into <body>. Use for full-screen overlays: any
 * ancestor with backdrop-filter (the glass cards), filter or transform becomes
 * the containing block for `position: fixed`, which would otherwise trap the
 * overlay inside that ancestor instead of covering the viewport.
 *
 * Only render this in response to user interaction (e.g. an open modal), since
 * there is no document during server rendering.
 */
export function Portal({
  children,
  container = 'body',
}: {
  children: React.ReactNode;
  // 'canvas' renders into the app canvas (Layout.tsx) instead, for popovers
  // that should float over page content but stay under the header (z-50):
  // the canvas isolates its own stacking, so z-indexes inside it can't be
  // compared with anything placed directly in <body>.
  container?: 'body' | 'canvas';
}) {
  if (typeof document === 'undefined') {
    return null;
  }
  const target =
    container === 'canvas'
      ? (document.querySelector('[data-portal-root]') ?? document.body)
      : document.body;
  return createPortal(children, target);
}
