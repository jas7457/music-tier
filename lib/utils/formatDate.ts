export function formatDate(
  timestamp: number,
  options: Intl.DateTimeFormatOptions = {}
) {
  const date = new Date(timestamp);
  const now = new Date();
  const timeZone = "America/New_York";

  // Use Intl to get the year *in Eastern time* for both dates
  const yearFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
  });

  const sameYearInET = yearFormatter.format(date) === yearFormatter.format(now);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYearInET ? {} : { year: "numeric" }),
    ...options,
    // Ensure EST/EDT no matter where this code runs
    timeZone,
  }).format(date);
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
