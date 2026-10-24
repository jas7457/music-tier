/**
 * A short, human "time ago" string, e.g. "just now", "5 min ago",
 * "3 hours ago", "yesterday". Falls back to a date for anything older than
 * a week.
 */
export function formatTimeAgo(timestamp: number, now: number = Date.now()) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 45) {
    return 'just now';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(hours / 24);
  if (days === 1) {
    return 'yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  return formatDate(timestamp);
}

export function formatDate(
  timestamp: number,
  options: Intl.DateTimeFormatOptions = {},
) {
  const date = new Date(timestamp);
  const timeZone = 'America/New_York';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...options,
    // Ensure EST/EDT no matter where this code runs
    timeZone,
  }).format(date);
}

export function formatDateWithTime(
  timestamp: number,
  options?: Intl.DateTimeFormatOptions,
) {
  return formatDate(timestamp, {
    hour: 'numeric',
    minute: 'numeric',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}
