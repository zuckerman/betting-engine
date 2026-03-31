import { PredictionBet } from "./types";

export interface FilterResult {
  allow: boolean;
  reason: string;
}

/**
 * Basic bet filter - only allow minimum edge
 */
export function shouldBet(edge: number): FilterResult {
  const MIN_EDGE = 0.02; // 2%

  if (edge < MIN_EDGE) {
    return {
      allow: false,
      reason: `Edge too small: ${(edge * 100).toFixed(2)}% < ${(MIN_EDGE * 100).toFixed(0)}%`,
    };
  }

  return {
    allow: true,
    reason: "Positive EV",
  };
}

/**
 * Advanced filter with odds range validation
 */
export function shouldBetAdvanced(bet: PredictionBet): FilterResult {
  const MIN_EDGE = 0.02;
  const MIN_ODDS = 1.5;
  const MAX_ODDS = 5.0;

  // Edge check
  if (bet.edge === undefined || bet.edge === null) {
    return {
      allow: false,
      reason: "No edge calculated",
    };
  }

  if (bet.edge < MIN_EDGE) {
    return {
      allow: false,
      reason: `Low edge: ${(bet.edge * 100).toFixed(2)}%`,
    };
  }

  // Odds range check
  if (bet.odds_taken < MIN_ODDS) {
    return {
      allow: false,
      reason: `Odds too low: ${bet.odds_taken.toFixed(2)} < ${MIN_ODDS}`,
    };
  }

  if (bet.odds_taken > MAX_ODDS) {
    return {
      allow: false,
      reason: `Odds too high: ${bet.odds_taken.toFixed(2)} > ${MAX_ODDS}`,
    };
  }

  return {
    allow: true,
    reason: "Approved",
  };
}

/**
 * Risk tier classification (for future use)
 */
export function getRiskTier(
  bet: PredictionBet
): "low" | "medium" | "high" | "rejected" {
  const filter = shouldBetAdvanced(bet);

  if (!filter.allow) {
    return "rejected";
  }

  if (bet.edge === undefined || bet.edge === null) {
    return "rejected";
  }

  if (bet.edge < 0.03) {
    return "low";
  }

  if (bet.edge < 0.06) {
    return "medium";
  }

  return "high";
}
