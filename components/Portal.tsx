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
export function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(children, document.body);
}
