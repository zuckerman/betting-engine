/**
 * Metrics service
 * Orchestrates the entire scoring pipeline
 */

import { Bet, ScoringResult } from "./types";
import { calculateMetrics } from "./scoring";
import { buildScoringResult } from "./classifier";
import { runIntegrityChecks } from "./integrity";

/**
 * Main scoring service
 * Single entry point: takes bets, returns full report
 */
export function scoreBets(bets: Bet[]): ScoringResult {
  // Calculate all metrics
  const metrics = calculateMetrics(bets);

  // Build base scoring result
  const result = buildScoringResult(metrics);

  // Run integrity checks and add any additional flags
  const integrityFlags = runIntegrityChecks(bets);
  result.riskFlags = [...result.riskFlags, ...integrityFlags];

  // Downgrade AMBER to reflect overfit
  if (integrityFlags.some((f) => f.includes("overfit"))) {
    result.diagnosis = "Potential overfitting detected across segments";
    result.instruction = "Verify edge is consistent across all market segments";
  }

  return result;
}
