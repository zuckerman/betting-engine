/**
 * Utility functions for calculations
 */

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const avg = mean(arr);
  const squaredDiffs = arr.map(x => Math.pow(x - avg, 2));
  return mean(squaredDiffs);
}

export function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

export function groupBy<T>(
  arr: T[],
  fn: (item: T) => string
): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const key = fn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export function round(num: number, decimals: number = 4): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
