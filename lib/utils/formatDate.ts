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
