'use client';

import NextLink, { useLinkStatus } from 'next/link';
import type { ComponentProps } from 'react';
import { useReportPending } from '@/lib/NavigationProgressContext';

/**
 * Drop-in replacement for next/link that drives the top progress bar while
 * the navigation it started is loading. The current page stays on screen.
 */
export default function AppLink({
  children,
  ...props
}: ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <LinkPendingReporter />
    </NextLink>
  );
}

// useLinkStatus only works in a descendant of the <Link> it reports on.
function LinkPendingReporter() {
  const { pending } = useLinkStatus();
  useReportPending(pending);
  return null;
}
