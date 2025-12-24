export function isChristmas(): boolean {
  const christmasStart = 1766552400000;
  const christmasEnd = 1766725200000;
  const now = Date.now();
  return now >= christmasStart && now <= christmasEnd;
}
