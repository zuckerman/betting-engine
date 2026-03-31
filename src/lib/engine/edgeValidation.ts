import { PredictionBet } from "./types";

export interface EdgeBucket {
  min: number;
  max: number;
  label: string;
}

export interface EdgeValidationResult {
  bucket: EdgeBucket;
  count: number;
  winRate: number;
  roi: number;
  totalStake: number;
  totalProfit: number;
  isUsable: boolean; // ROI > 0 and sample > 5
}

const EDGE_BUCKETS: EdgeBucket[] = [
  { min: -1.0, max: 0.0, label: "Negative Edge" },
  { min: 0.0, max: 0.02, label: "0-2%" },
  { min: 0.02, max: 0.05, label: "2-5%" },
  { min: 0.05, max: 1.0, label: "5%+" },
];

/**
 * Edge validation: Are higher edges producing better results?
 */
export function edgeValidation(bets: PredictionBet[]): EdgeValidationResult[] {
  const settled = bets.filter((b) => b.status === "settled");

  return EDGE_BUCKETS.map((bucket) => {
    // Filter bets in this edge range
    const group = settled.filter((b) => {
      const edge = b.edge ?? 0;
      return edge >= bucket.min && edge < bucket.max;
    });

    if (group.length === 0) {
      return {
        bucket,
        count: 0,
        winRate: 0,
        roi: 0,
        totalStake: 0,
        totalProfit: 0,
        isUsable: false,
      };
    }

    // Calculate metrics
    const wins = group.filter((b) => b.result === b.prediction).length;
    const winRate = wins / group.length;

    const totalStake = group.reduce((sum, b) => sum + b.stake, 0);
    const totalProfit = group.reduce((sum, b) => sum + (b.profit || 0), 0);
    const roi = totalStake > 0 ? totalProfit / totalStake : 0;

    // Usable if: ROI > 0 and enough sample size
    const isUsable = roi > 0 && group.length >= 5;

    return {
      bucket,
      count: group.length,
      winRate,
      roi,
      totalStake,
      totalProfit,
      isUsable,
    };
  });
}

/**
 * Edge health check
 */
export function edgeHealth(
  bets: PredictionBet[]
): {
  healthy: boolean;
  summary: string;
  warnings: string[];
  usableBuckets: number;
} {
  const results = edgeValidation(bets);
  const withBets = results.filter((r) => r.count >= 5);

  if (withBets.length === 0) {
    return {
      healthy: true,
      summary: "Not enough bets per bucket to validate edge",
      warnings: [],
      usableBuckets: 0,
    };
  }

  const warnings: string[] = [];
  let usableBuckets = 0;

  // Check each bucket
  withBets.forEach((result) => {
    if (result.roi > 0) {
      usableBuckets++;
    } else if (result.bucket.min >= 0.02) {
      // We expect positive ROI from positive edge
      warnings.push(
        `${result.bucket.label}: Negative ROI despite positive edge (${(result.roi * 100).toFixed(1)}%)`
      );
    }
  });

  const healthy = warnings.length === 0 && usableBuckets > 0;

  let summary = "✓ Edge is performing as expected";
  if (warnings.length > 0) {
    summary = "⚠️ Edge validation issues detected";
  } else if (usableBuckets === 0) {
    summary = "❌ No usable edge buckets";
  }

  return {
    healthy,
    summary,
    warnings,
    usableBuckets,
  };
}

/**
 * Compare edge tiers (low vs medium vs high)
 */
export function comparEdgeTiers(
  bets: PredictionBet[]
): {
  low: EdgeValidationResult;
  medium: EdgeValidationResult;
  high: EdgeValidationResult;
  winner: string;
} {
  const results = edgeValidation(bets);

  return {
    low: results[1], // 0-2%
    medium: results[2], // 2-5%
    high: results[3], // 5%+
    winner:
      results[3].roi > results[2].roi && results[3].roi > results[1].roi
        ? "high"
        : results[2].roi > results[1].roi
          ? "medium"
          : "low",
  };
}
