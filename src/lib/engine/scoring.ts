/**
 * Core scoring calculations
 *
 * Formulas:
 * - CLV = (odds_taken / odds_closing) - 1
 * - P_closing = 1 / odds_closing
 * - EV = (odds_taken * P_closing) - 1
 * - ROI = profit / total_stake
 * - Confidence = 1 - e^(-N / 300)
 * - Z = (ROI - xROI) / (σ / √N)
 */

import { Bet, Metrics } from "./types";
import { mean, sum, stdDev, round } from "./utils";

/**
 * Calculate profit for a single bet
 */
export function calcBetProfit(bet: Bet): number {
  if (bet.result === "push") return 0;
  if (bet.result === "win") {
    return bet.stake * (bet.odds_taken - 1);
  }
  return -bet.stake;
}

/**
 * Calculate return (as decimal, not percentage)
 * Return = profit / stake (can be negative)
 */
export function calcBetReturn(bet: Bet): number {
  return calcBetProfit(bet) / bet.stake;
}

/**
 * Core metrics calculation
 * This is the engine.
 */
export function calculateMetrics(bets: Bet[]): Metrics {
  const N = bets.length;

  // Handle edge case
  if (N === 0) {
    return {
      N: 0,
      clv_avg: 0,
      xroi: 0,
      roi: 0,
      confidence: 0,
      z_score: 0,
    };
  }

  // 1. CLV calculation
  const clvValues = bets.map((b) => (b.odds_taken / b.odds_closing) - 1);
  const clv_avg = mean(clvValues);

  // 2. Implied probability
  const impliedProbs = bets.map((b) => 1 / b.odds_closing);

  // 3. Expected Value per bet
  const evValues = bets.map((b) => (b.odds_taken * (1 / b.odds_closing)) - 1);
  const xroi = mean(evValues);

  // 4. Real ROI
  const totalStake = sum(bets.map((b) => b.stake));
  const profit = sum(bets.map((b) => calcBetProfit(b)));
  const roi = totalStake > 0 ? profit / totalStake : 0;

  // 5. Confidence function
  const confidence = 1 - Math.exp(-N / 300);

  // 6. Z-score (variance test)
  const returns = bets.map((b) => calcBetReturn(b));
  const std = stdDev(returns);
  let z_score = 0;

  if (std > 0 && N > 1) {
    z_score = (roi - xroi) / (std / Math.sqrt(N));
  }

  return {
    N,
    clv_avg: round(clv_avg),
    xroi: round(xroi),
    roi: round(roi),
    confidence: round(confidence),
    z_score: round(z_score),
  };
}
