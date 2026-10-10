// components/np/trend.ts — "+12% vs avg" for the Sleep / Load capsules on Today.

/** Today against the mean of the earlier days, in whole percent. null when there is too little to compare (< 3 earlier values) or the mean is 0. */
export function pctVsAvg(today: number | null, earlier: readonly (number | null)[]): number | null {
  if (today === null) return null;
  const e = earlier.filter((v): v is number => v !== null);
  if (e.length < 3) return null;
  const mean = e.reduce((a, b) => a + b, 0) / e.length;
  if (mean <= 0) return null;
  return Math.round(((today - mean) / mean) * 100);
}
