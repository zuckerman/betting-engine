import { PredictionBet } from "./types";

export interface EdgeResult {
  edge: number;
  marketProb: number;
  modelProb: number;
}

export interface EdgeBucket {
  min: number;
  max: number;
  label: string;
}

export interface CalibrationResult {
  bucket: EdgeBucket;
  count: number;
  winRate: number;
  expectedWinRate: number;
  accuracy: string; // "calibrated" | "over-confident" | "under-confident"
}

/**
 * Calculate edge for a single bet
 * Edge = model_probability - implied_market_probability
 */
export function calculateEdge(bet: PredictionBet): EdgeResult {
  const marketProb = 1 / bet.odds_taken;
  const edge = bet.model_probability - marketProb;

  return {
    edge,
    marketProb,
    modelProb: bet.model_probability,
  };
}

/**
 * Calibration buckets for edge analysis
 */
const EDGE_BUCKETS: EdgeBucket[] = [
  { min: -1.0, max: 0.0, label: "Negative Edge" },
  { min: 0.0, max: 0.02, label: "0-2% Edge" },
  { min: 0.02, max: 0.05, label: "2-5% Edge" },
  { min: 0.05, max: 1.0, label: "5%+ Edge" },
];

/**
 * Expected win rate by edge bucket
 * This is theoretical - your actual results should match
 */
function expectedWinRate(bucket: EdgeBucket): number {
  // For a bucket, expected win rate ≈ average implied prob + average edge
  // Conservative estimates:
  if (bucket.min < 0.0) return 0.45; // Negative edge
  if (bucket.max <= 0.02) return 0.505; // ~50% base + 0-2% edge
  if (bucket.max <= 0.05) return 0.535; // ~50% base + 2-5% edge
  return 0.555; // ~50% base + 5%+ edge
}

/**
 * Analyze calibration across edge buckets
 * Shows if your model's edge claims match reality
 */
export function edgeCalibration(bets: PredictionBet[]): CalibrationResult[] {
  const settled = bets.filter((b) => b.status === "settled");

  return EDGE_BUCKETS.map((bucket) => {
    // Filter bets in this edge range
    const group = settled.filter((b) => {
      const { edge } = calculateEdge(b);
      return edge >= bucket.min && edge < bucket.max;
    });

    // Calculate actual win rate
    const wins = group.filter((b) => b.result === b.prediction).length;
    const winRate = group.length > 0 ? wins / group.length : 0;

    // Expected win rate for this bucket
    const expected = expectedWinRate(bucket);

    // Determine accuracy
    let accuracy = "calibrated";
    if (winRate > expected + 0.05) {
      accuracy = "under-confident"; // Model was pessimistic
    } else if (winRate < expected - 0.05) {
      accuracy = "over-confident"; // Model was optimistic
    }

    return {
      bucket,
      count: group.length,
      winRate,
      expectedWinRate: expected,
      accuracy,
    };
  });
}

/**
 * Check overall edge calibration health
 * Returns summary and any warnings
 */
export function calibrationHealth(
  bets: PredictionBet[]
): { healthy: boolean; summary: string; warnings: string[] } {
  const results = edgeCalibration(bets);
  const warnings: string[] = [];

  // Check for over-confidence (model too optimistic)
  const overConfident = results.filter((r) => r.accuracy === "over-confident");
  if (overConfident.length > 0) {
    warnings.push(
      `Over-confidence detected in ${overConfident.map((r) => r.bucket.label).join(", ")}`
    );
  }

  // Check for under-confidence
  const underConfident = results.filter(
    (r) => r.accuracy === "under-confident"
  );
  if (underConfident.length > 0) {
    warnings.push(
      `Under-confidence in ${underConfident.map((r) => r.bucket.label).join(", ")}`
    );
  }

  const healthy = warnings.length === 0;

  let summary = "Model is well-calibrated";
  if (warnings.length > 0) {
    summary = "Model calibration issues detected";
  }

  return { healthy, summary, warnings };
}
