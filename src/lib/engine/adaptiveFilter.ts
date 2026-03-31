/**
 * Adaptive Filter & Kelly
 * Adjusts thresholds based on model reliability
 */

import { adjustProbability } from "./adjustment";

export interface AdaptiveContext {
  calibrationError: number; // |actual - expected|
  recentAccuracy: number; // 0-1 win rate
  segmentWeight: number; // 0.5-1.5
}

/**
 * Adaptive edge threshold
 * Tighten when model unreliable, loosen when strong
 */
export function adaptiveThreshold(context: AdaptiveContext): number {
  const baseThreshold = 0.02; // 2%

  // If model is unreliable: require higher edge
  if (context.calibrationError > 0.1) {
    return baseThreshold * 2; // 4%
  }

  if (context.calibrationError > 0.05) {
    return baseThreshold * 1.5; // 3%
  }

  // If model is reliable: can take smaller edge
  if (context.calibrationError < 0.02) {
    return baseThreshold * 0.8; // 1.6%
  }

  if (context.calibrationError < 0.01) {
    return baseThreshold * 0.6; // 1.2%
  }

  return baseThreshold;
}

/**
 * Adaptive filter with dynamic thresholds
 */
export function shouldBetAdaptive(
  bet: any,
  context: AdaptiveContext
): {
  allow: boolean;
  reason: string;
  threshold: number;
} {
  const threshold = adaptiveThreshold(context);

  if (bet.edge === undefined || bet.edge === null) {
    return {
      allow: false,
      reason: "No edge calculated",
      threshold,
    };
  }

  if (bet.edge < threshold) {
    return {
      allow: false,
      reason: `Edge ${(bet.edge * 100).toFixed(2)}% < threshold ${(threshold * 100).toFixed(1)}%`,
      threshold,
    };
  }

  return {
    allow: true,
    reason: "Approved",
    threshold,
  };
}

/**
 * Adaptive Kelly with context-based sizing
 */
export function adaptiveKelly(
  bet: any,
  bankroll: number,
  context: AdaptiveContext
): number {
  const adjustedProb = adjustProbability(bet.model_probability, context.calibrationError);

  const b = bet.odds_taken - 1;
  const q = 1 - adjustedProb;

  let f = (b * adjustedProb - q) / b;

  if (f <= 0) return 0;

  // Reduce sizing if model unreliable
  if (context.calibrationError > 0.1) {
    f *= 0.4; // 40% of normal Kelly
  } else if (context.calibrationError > 0.05) {
    f *= 0.65; // 65% of normal Kelly
  }

  // Boost slightly if model is very reliable
  if (context.calibrationError < 0.015) {
    f *= 1.15;
  }

  // Apply segment weight
  f *= context.segmentWeight;

  // Apply 1/4 Kelly for safety
  f *= 0.25;

  // Hard cap at 2% of bankroll
  const maxStake = bankroll * 0.02;
  const stake = Math.min(bankroll * f, maxStake);

  return Math.max(0, stake);
}
