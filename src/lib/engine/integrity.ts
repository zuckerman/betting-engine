/**
 * Overfit detection + integrity checks
 */

import { Bet } from "./types";
import { calculateMetrics } from "./scoring";
import { groupBy } from "./utils";

/**
 * Detect overfitting by segmenting bets
 *
 * Rule: if one segment has strong positive xROI
 *       but others have strong negative xROI,
 *       then likely overfit
 */
export function detectOverfit(bets: Bet[]): string[] {
  const flags: string[] = [];

  // Segment by league
  if (bets.some((b) => b.league)) {
    const byLeague = groupBy(bets, (b) => b.league || "unknown");
    const scores = Object.entries(byLeague)
      .filter(([_, group]) => group.length >= 50) // only meaningful segments
      .map(([_, group]) => calculateMetrics(group).xroi);

    if (scores.length >= 2) {
      const max = Math.max(...scores);
      const min = Math.min(...scores);

      if (max > 0.05 && min < -0.05) {
        flags.push("overfit_by_league");
      }
    }
  }

  // Segment by market type
  if (bets.some((b) => b.market_type)) {
    const byMarket = groupBy(bets, (b) => b.market_type || "unknown");
    const scores = Object.entries(byMarket)
      .filter(([_, group]) => group.length >= 50)
      .map(([_, group]) => calculateMetrics(group).xroi);

    if (scores.length >= 2) {
      const max = Math.max(...scores);
      const min = Math.min(...scores);

      if (max > 0.05 && min < -0.05) {
        flags.push("overfit_by_market");
      }
    }
  }

  // Segment by odds range
  if (bets.some((b) => b.odds_range)) {
    const byOdds = groupBy(bets, (b) => b.odds_range || "unknown");
    const scores = Object.entries(byOdds)
      .filter(([_, group]) => group.length >= 50)
      .map(([_, group]) => calculateMetrics(group).xroi);

    if (scores.length >= 2) {
      const max = Math.max(...scores);
      const min = Math.min(...scores);

      if (max > 0.05 && min < -0.05) {
        flags.push("overfit_by_odds_range");
      }
    }
  }

  return flags;
}

/**
 * CLV integrity check
 *
 * Split bets chronologically into early/late
 * If early CLV > late CLV, real edge
 * Else, likely noise or following market
 */
export function checkClvIntegrity(bets: Bet[]): string[] {
  const flags: string[] = [];

  if (bets.length < 100) return flags;

  // Sort by placed_at
  const sorted = [...bets].sort(
    (a, b) =>
      (a.settled_at?.getTime() || 0) - (b.settled_at?.getTime() || 0)
  );

  const mid = Math.floor(sorted.length / 2);
  const earlyBets = sorted.slice(0, mid);
  const lateBets = sorted.slice(mid);

  const earlyMetrics = calculateMetrics(earlyBets);
  const lateMetrics = calculateMetrics(lateBets);

  // If late CLV is better than early, you're following market
  if (lateMetrics.clv_avg > earlyMetrics.clv_avg && earlyMetrics.clv_avg > 0) {
    flags.push("deteriorating_clv_edge");
  }

  return flags;
}

/**
 * Apply all integrity checks
 */
export function runIntegrityChecks(bets: Bet[]): string[] {
  const flags: string[] = [];

  flags.push(...detectOverfit(bets));
  flags.push(...checkClvIntegrity(bets));

  return flags;
}
