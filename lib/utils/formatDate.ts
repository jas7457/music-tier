export function formatDate(
  timestamp: number,
  options?: Intl.DateTimeFormatOptions
) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}
