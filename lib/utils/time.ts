export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getNowInEasternTime(): Date {
  const now = new Date();
  const options = { timeZone: "America/New_York" };
  const local = new Date(now.toLocaleString("en-US", options));
  return local;
}
