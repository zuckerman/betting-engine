/**
 * Test data and scenarios for validation
 */

import { Bet } from "@/lib/engine/types";

/**
 * Scenario 1: Small sample (BLACK)
 * Only 50 bets - should return BLACK
 */
export const smallSampleBets: Bet[] = Array.from({ length: 50 }, () => ({
  odds_taken: 1.9 + Math.random() * 0.2,
  odds_closing: 1.95,
  stake: 100,
  result: Math.random() > 0.5 ? "win" : "loss",
}));

/**
 * Scenario 2: Confirmed negative edge (RED)
 * 300+ bets, CLV < -0.01, xROI < -0.02
 */
export const negativeEdgeBets: Bet[] = Array.from({ length: 350 }, (_, i) => ({
  odds_taken: 1.85, // Consistently low odds taken
  odds_closing: 1.95,
  stake: 100,
  result: i % 3 === 0 ? "win" : "loss", // ~33% win rate, lose money
}));

/**
 * Scenario 3: Confirmed positive edge (GREEN)
 * 300+ bets, CLV > 0.01, xROI > 0.01
 */
export const positiveEdgeBets: Bet[] = Array.from({ length: 350 }, (_, i) => ({
  odds_taken: 2.05, // Consistently good odds taken
  odds_closing: 1.95,
  stake: 100,
  result: i % 2 === 0 ? "win" : "loss", // 50% win rate with +5% edge
}));

/**
 * Scenario 4: Marginal edge (AMBER)
 * 300+ bets, CLV and xROI both near zero
 */
export const marginalBets: Bet[] = Array.from({ length: 300 }, (_, i) => ({
  odds_taken: 1.93 + (Math.random() - 0.5) * 0.05, // Tight range
  odds_closing: 1.94,
  stake: 100,
  result: i % 2 === 0 ? "win" : "loss", // 50% win rate, ~0% edge
}));

/**
 * Scenario 5: Positive expected value but negative realized (variance)
 * High xROI but actual ROI is negative
 */
export const varianceBets: Bet[] = [
  // First 200: positive edge
  ...Array.from({ length: 200 }, () => ({
    odds_taken: 2.02,
    odds_closing: 1.95,
    stake: 100,
    result: Math.random() > 0.5 ? "win" : "loss", // should win 50%
  })),
  // Last 100: bad luck streak
  ...Array.from({ length: 100 }, () => ({
    odds_taken: 2.02,
    odds_closing: 1.95,
    stake: 100,
    result: "loss" as const, // 0% win rate - bad variance
  })),
];

/**
 * Scenario 6: Overfit detection
 * NBA league: strong edge
 * EPL league: negative edge
 */
export const overfitBets: Bet[] = [
  // NBA: positive
  ...Array.from({ length: 150 }, (_, i) => ({
    odds_taken: 2.05,
    odds_closing: 1.95,
    stake: 100,
    result: i % 2 === 0 ? ("win" as const) : ("loss" as const),
    league: "NBA",
  })),
  // EPL: negative
  ...Array.from({ length: 150 }, (_, i) => ({
    odds_taken: 1.85,
    odds_closing: 1.95,
    stake: 100,
    result: i % 3 === 0 ? ("win" as const) : ("loss" as const),
    league: "EPL",
  })),
];

/**
 * Scenario 7: Real-world mixed strategy
 * Diverse results, edge indistinguishable from noise
 */
export const mixedStrategyBets: Bet[] = Array.from({ length: 300 }, (_, i) => ({
  odds_taken: 1.8 + Math.random() * 0.4,
  odds_closing: 1.9 + Math.random() * 0.1,
  stake: 50 + Math.random() * 100,
  result:
    i % 100 < 52
      ? ("win" as const)
      : i % 100 < 100
        ? ("loss" as const)
        : ("push" as const),
  market_type: ["moneyline", "spread", "totals"][i % 3],
  league: ["NBA", "EPL", "NFL", "MLB"][i % 4],
}));
