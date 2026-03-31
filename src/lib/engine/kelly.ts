import { PredictionBet } from "./types";

export interface KellyResult {
  f: number; // Kelly fraction (as decimal)
  stake: number; // Stake in currency
  fractional: number; // Fractional kelly applied (e.g., 0.25)
  maxStake: number; // Hard cap
}

/**
 * Calculate Kelly fraction
 * f = (bp - q) / b
 * where:
 *   b = odds - 1
 *   p = probability
 *   q = 1 - p
 */
export function calculateKellyFraction(bet: PredictionBet): number {
  const p = bet.model_probability;
  const b = bet.odds_taken - 1;
  const q = 1 - p;

  // Kelly formula
  let f = (b * p - q) / b;

  // No edge = no bet
  if (f <= 0) {
    return 0;
  }

  return f;
}

/**
 * Calculate stake using Kelly criterion with safety features
 */
export function calculateKelly(
  bet: PredictionBet,
  bankroll: number,
  fractionalMultiplier: number = 0.25
): KellyResult {
  const f = calculateKellyFraction(bet);

  // No edge
  if (f <= 0) {
    return {
      f: 0,
      stake: 0,
      fractional: 0,
      maxStake: 0,
    };
  }

  // Apply fractional Kelly (safer than full Kelly)
  // Full Kelly can be too aggressive; 1/4 Kelly is common
  const fractionalF = f * fractionalMultiplier;

  // Hard cap: never risk more than 2% of bankroll per bet
  const maxStake = bankroll * 0.02;

  // Calculate stake
  let stake = bankroll * fractionalF;

  // Apply hard cap
  stake = Math.min(stake, maxStake);

  return {
    f,
    stake,
    fractional: fractionalF,
    maxStake,
  };
}

/**
 * Advanced Kelly with risk tiers
 * Higher confidence = higher multiplier
 */
export function calculateKellyAdvanced(
  bet: PredictionBet,
  bankroll: number,
  confidence: number = 0.5 // 0-1, where 1 = very confident
): KellyResult {
  const f = calculateKellyFraction(bet);

  if (f <= 0) {
    return {
      f: 0,
      stake: 0,
      fractional: 0,
      maxStake: 0,
    };
  }

  // Adjust fractional multiplier based on confidence
  let multiplier = 0.1; // Conservative base
  if (confidence > 0.7) multiplier = 0.25;
  if (confidence > 0.85) multiplier = 0.5;

  const fractionalF = f * multiplier;
  const maxStake = bankroll * 0.02;
  let stake = bankroll * fractionalF;
  stake = Math.min(stake, maxStake);

  return {
    f,
    stake,
    fractional: fractionalF,
    maxStake,
  };
}

/**
 * Growth-focused Kelly (more aggressive)
 * Used only when edge is very clear
 */
export function calculateKellyGrowth(
  bet: PredictionBet,
  bankroll: number
): KellyResult {
  const f = calculateKellyFraction(bet);

  if (f <= 0) {
    return {
      f: 0,
      stake: 0,
      fractional: 0,
      maxStake: 0,
    };
  }

  // Only apply if edge is very strong (5%+)
  if (bet.edge === undefined || bet.edge === null || bet.edge < 0.05) {
    return calculateKelly(bet, bankroll, 0.25);
  }

  // For strong edges, use 1/2 Kelly
  const fractionalF = f * 0.5;
  const maxStake = bankroll * 0.03;
  let stake = bankroll * fractionalF;
  stake = Math.min(stake, maxStake);

  return {
    f,
    stake,
    fractional: fractionalF,
    maxStake,
  };
}
