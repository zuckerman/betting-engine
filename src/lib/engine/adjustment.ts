/**
 * Probability Adjustment Layer
 * Fixes systematic bias based on calibration errors
 */

/**
 * Adjust model probability based on calibration error
 * If model was overconfident, reduce prediction
 * If underconfident, increase prediction
 */
export function adjustProbability(
  modelProb: number,
  calibrationError: number
): number {
  // calibrationError = actual - expected
  // If negative: model was overconfident
  // If positive: model was underconfident

  const adjusted = modelProb - calibrationError;

  // Clamp to safe range [0.01, 0.99]
  return Math.max(0.01, Math.min(0.99, adjusted));
}

/**
 * Confidence-based adjustment
 * Higher confidence allows larger adjustments
 */
export function adjustProbabilityByConfidence(
  modelProb: number,
  calibrationError: number,
  confidence: number // 0-1
): number {
  // Scale adjustment by confidence
  const scaledError = calibrationError * (1 - confidence * 0.5);

  const adjusted = modelProb - scaledError;

  return Math.max(0.01, Math.min(0.99, adjusted));
}

/**
 * Time-weighted adjustment
 * Recent errors matter more than old ones
 */
export function adjustProbabilityTimeWeighted(
  modelProb: number,
  recentError: number, // last 30 days
  historicalError: number // all-time
): number {
  // Weight recent more heavily
  const weightedError = recentError * 0.7 + historicalError * 0.3;

  const adjusted = modelProb - weightedError;

  return Math.max(0.01, Math.min(0.99, adjusted));
}
