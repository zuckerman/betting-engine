/**
 * Probability Calibration System
 *
 * Corrects model's predicted probabilities based on actual outcomes
 * Uses Bayesian binning to map "what we said" to "what actually happened"
 *
 * PROBLEM: Model says 62% but actually wins 55% when it predicts 60-65%
 * SOLUTION: Recalibrate to true 55% for future predictions
 */

export interface CalibrationBucket {
  bucket: string; // "0.5-0.6", "0.6-0.7", etc
  expectedProb: number; // What we predicted
  actualProb: number; // What actually happened
  sampleSize: number; // Number of bets in this bucket
  wins: number;
  totalCLV: number;
}

export interface CalibrationData {
  buckets: Record<string, CalibrationBucket>;
  lastUpdated: string;
  totalBets: number;
}

/**
 * Determine probability bucket
 * Groups similar probabilities together for statistical power
 */
export function getProbabilityBucket(probability: number): string {
  if (probability < 0.5) return '0.4-0.5';
  if (probability < 0.55) return '0.5-0.55';
  if (probability < 0.6) return '0.55-0.6';
  if (probability < 0.65) return '0.6-0.65';
  if (probability < 0.7) return '0.65-0.7';
  if (probability < 0.75) return '0.7-0.75';
  return '0.75+';
}

/**
 * Extract midpoint of bucket for calibration
 */
export function getBucketMidpoint(bucket: string): number {
  const [low, high] = bucket
    .replace('+', '')
    .split('-')
    .map((x) => parseFloat(x));

  return bucket.includes('+') ? high : (low + high) / 2;
}

/**
 * Update calibration data from predictions
 * Run this after each batch of outcomes
 */
export function updateCalibration(predictions: Array<{
  probability: number;
  result: 'win' | 'loss'; // 1 or 0
  closingOdds: number;
  takenOdds: number;
  clv?: number;
}>): CalibrationData {
  const buckets: Record<string, CalibrationBucket> = {};

  predictions.forEach((pred) => {
    const bucket = getProbabilityBucket(pred.probability);
    const midpoint = getBucketMidpoint(bucket);

    if (!buckets[bucket]) {
      buckets[bucket] = {
        bucket,
        expectedProb: midpoint,
        actualProb: 0,
        sampleSize: 0,
        wins: 0,
        totalCLV: 0,
      };
    }

    buckets[bucket].sampleSize += 1;
    if (pred.result === 'win') {
      buckets[bucket].wins += 1;
    }

    if (pred.clv) {
      buckets[bucket].totalCLV += pred.clv;
    }
  });

  // Calculate actual probability per bucket
  Object.values(buckets).forEach((b) => {
    b.actualProb = b.sampleSize > 0 ? b.wins / b.sampleSize : 0;
  });

  return {
    buckets,
    lastUpdated: new Date().toISOString(),
    totalBets: predictions.length,
  };
}

/**
 * Adjust predicted probability based on calibration
 * Returns calibrated probability (what actually happens)
 */
export function calibrateProbability(
  probability: number,
  calibrationData: CalibrationData | null
): number {
  if (!calibrationData) return probability;

  const bucket = getProbabilityBucket(probability);
  const calibration = calibrationData.buckets[bucket];

  if (!calibration || calibration.sampleSize < 20) {
    // Insufficient data, return original
    return probability;
  }

  // Adjust probability to match actual
  const ratio = calibration.actualProb / calibration.expectedProb;
  const calibrated = probability * ratio;

  // Clamp to valid range
  return Math.max(0.01, Math.min(0.99, calibrated));
}

/**
 * Check if model is well-calibrated overall
 * Returns calibration error (lower is better)
 */
export function getCalibrationError(
  calibrationData: CalibrationData
): number {
  let totalError = 0;
  let count = 0;

  Object.values(calibrationData.buckets).forEach((b) => {
    if (b.sampleSize >= 10) {
      totalError += Math.abs(b.expectedProb - b.actualProb);
      count += 1;
    }
  });

  return count > 0 ? totalError / count : 0;
}

/**
 * Identify over/underconfident regions
 */
export function getCalibrationIssues(
  calibrationData: CalibrationData
): {
  overconfident: CalibrationBucket[];
  underconfident: CalibrationBucket[];
} {
  const overconfident: CalibrationBucket[] = [];
  const underconfident: CalibrationBucket[] = [];

  Object.values(calibrationData.buckets).forEach((b) => {
    if (b.sampleSize < 15) return; // Skip low sample sizes

    if (b.expectedProb > b.actualProb + 0.05) {
      // Expected higher than actual = overconfident
      overconfident.push(b);
    } else if (b.expectedProb < b.actualProb - 0.05) {
      // Expected lower than actual = underconfident
      underconfident.push(b);
    }
  });

  return { overconfident, underconfident };
}

/**
 * Calculate calibration curve (for UI visualization)
 */
export function getCalibrationCurve(
  calibrationData: CalibrationData
): Array<{
  expected: number;
  actual: number;
  sampleSize: number;
}> {
  return Object.values(calibrationData.buckets)
    .filter((b) => b.sampleSize >= 10)
    .map((b) => ({
      expected: b.expectedProb,
      actual: b.actualProb,
      sampleSize: b.sampleSize,
    }))
    .sort((a, b) => a.expected - b.expected);
}

/**
 * Persistence helpers
 */
export function serializeCalibration(data: CalibrationData): string {
  return JSON.stringify(data);
}

export function deserializeCalibration(json: string): CalibrationData {
  return JSON.parse(json);
}
