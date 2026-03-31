import { PredictionBet } from "./types";

export interface CalibrationBucket {
  min: number;
  max: number;
  label: string;
}

export interface CalibrationResult {
  bucket: CalibrationBucket;
  count: number;
  expected: number; // Expected win rate
  actual: number; // Actual win rate
  error: number; // actual - expected
  status: "calibrated" | "overconfident" | "underconfident";
}

const PROBABILITY_BUCKETS: CalibrationBucket[] = [
  { min: 0.45, max: 0.50, label: "45-50%" },
  { min: 0.50, max: 0.55, label: "50-55%" },
  { min: 0.55, max: 0.60, label: "55-60%" },
  { min: 0.60, max: 0.65, label: "60-65%" },
  { min: 0.65, max: 1.0, label: "65%+" },
];

/**
 * Calibration report: Are predicted probabilities matching actual results?
 */
export function calibrationReport(bets: PredictionBet[]): CalibrationResult[] {
  const settled = bets.filter((b) => b.status === "settled");

  return PROBABILITY_BUCKETS.map((bucket) => {
    // Filter bets in this probability range
    const group = settled.filter(
      (b) =>
        b.model_probability >= bucket.min &&
        b.model_probability < bucket.max
    );

    if (group.length === 0) {
      return {
        bucket,
        count: 0,
        expected: 0,
        actual: 0,
        error: 0,
        status: "calibrated",
      };
    }

    // Calculate actual win rate
    const wins = group.filter((b) => b.result === b.prediction).length;
    const actual = wins / group.length;

    // Calculate expected win rate (average model probability in bucket)
    const expected =
      group.reduce((sum, b) => sum + b.model_probability, 0) / group.length;

    // Calculate error
    const error = actual - expected;

    // Determine status
    let status: "calibrated" | "overconfident" | "underconfident" =
      "calibrated";
    if (error < -0.05) {
      status = "overconfident"; // Model was too optimistic
    } else if (error > 0.05) {
      status = "underconfident"; // Model was too pessimistic
    }

    return {
      bucket,
      count: group.length,
      expected,
      actual,
      error,
      status,
    };
  });
}

/**
 * Overall calibration health check
 */
export function calibrationHealth(
  bets: PredictionBet[]
): {
  healthy: boolean;
  summary: string;
  warnings: string[];
  avgError: number;
} {
  const results = calibrationReport(bets);

  const withBets = results.filter((r) => r.count > 0);
  if (withBets.length === 0) {
    return {
      healthy: true,
      summary: "Not enough settled bets to calibrate",
      warnings: [],
      avgError: 0,
    };
  }

  const totalError = withBets.reduce((sum, r) => sum + Math.abs(r.error), 0);
  const avgError = totalError / withBets.length;

  const warnings: string[] = [];

  // Check for over-confidence
  const overconfident = withBets.filter((r) => r.status === "overconfident");
  if (overconfident.length > 0) {
    warnings.push(
      `Over-confidence: ${overconfident.map((r) => r.bucket.label).join(", ")}`
    );
  }

  // Check for under-confidence
  const underconfident = withBets.filter((r) => r.status === "underconfident");
  if (underconfident.length > 0) {
    warnings.push(
      `Under-confidence: ${underconfident.map((r) => r.bucket.label).join(", ")}`
    );
  }

  const healthy = avgError < 0.05 && warnings.length === 0;

  let summary = "✓ Model is well-calibrated";
  if (avgError > 0.15) {
    summary = "⚠️ Significant calibration issues";
  } else if (avgError > 0.08) {
    summary = "⚠️ Minor calibration drift";
  }

  return {
    healthy,
    summary,
    warnings,
    avgError,
  };
}
