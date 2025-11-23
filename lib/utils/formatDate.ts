export function formatDate(
  timestamp: number,
  options?: Intl.DateTimeFormatOptions
) {
  const date = new Date(timestamp);
  const now = new Date();

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
    ...options,
  });
}

export function formatDateWithTime(
  timestamp: number,
  options?: Intl.DateTimeFormatOptions
) {
  return formatDate(timestamp, {
    hour: "numeric",
    minute: "numeric",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
}
