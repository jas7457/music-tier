export function formatDate(
  timestamp: number,
  options?: Intl.DateTimeFormatOptions
) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...options,
  });
}

export function formatDateWithTime(timestamp: number) {
  return formatDate(timestamp, {
    hour: "numeric",
    minute: "numeric",
    year: "numeric",
  });
}
