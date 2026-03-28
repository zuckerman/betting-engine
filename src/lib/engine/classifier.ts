/**
 * State classifier
 *
 * Hard decision rules:
 * - BLACK: N < 100 (no data)
 * - RED: N >= 300 AND clv_avg < -0.01 AND xroi < -0.02
 * - GREEN: N >= 300 AND clv_avg > 0.01 AND xroi > 0.01
 * - AMBER: everything else (marginal or unclear)
 */

import { Metrics, BettorState, ScoringResult } from "./types";

interface ClassifierState {
  state: BettorState;
  diagnosis: string;
  instruction: string;
  riskFlags: string[];
}

/**
 * Classify bettor state based on metrics
 */
export function classify(metrics: Metrics): ClassifierState {
  const { N, clv_avg, xroi, roi, z_score } = metrics;

  // 1. BLACK — insufficient data
  if (N < 100) {
    return {
      state: "BLACK",
      diagnosis: `Only ${N} bets recorded. Minimum 100 required for analysis.`,
      instruction: "Collect more betting data before making decisions",
      riskFlags: ["insufficient_sample"],
    };
  }

  // 2. RED — hard stop conditions
  if (N >= 300 && clv_avg < -0.01 && xroi < -0.02) {
    return {
      state: "RED",
      diagnosis: "Negative edge confirmed: beating market and losing value",
      instruction: "Cease betting immediately. Review strategy.",
      riskFlags: ["structural_loss", "confirmed_negative_edge"],
    };
  }

  // 3. GREEN — confirmed positive edge
  if (N >= 300 && clv_avg > 0.01 && xroi > 0.01) {
    return {
      state: "GREEN",
      diagnosis: "Positive edge confirmed: beating market AND positive ROI",
      instruction: "Scale stake gradually. Monitor for consistency.",
      riskFlags: [],
    };
  }

  // 4. AMBER — default (marginal, unclear, or needs more data)
  let diagnosis = "Marginal or unclear edge";
  let instruction = "Reduce stake and refine strategy";
  let riskFlags: string[] = [];

  // Variance override: positive xROI but negative ROI
  if (xroi > 0 && roi < 0 && Math.abs(z_score) <= 1) {
    diagnosis = "Positive edge detected, but experiencing variance drawdown";
    instruction = "Continue betting. Reduce stake volatility to weather variance.";
    riskFlags.push("variance_drawdown");
  }

  // High variance signal
  if (Math.abs(z_score) > 2) {
    riskFlags.push("high_variance");
  }

  // Edge too close to zero
  if (Math.abs(clv_avg) < 0.005 && Math.abs(xroi) < 0.005) {
    diagnosis = "Edge indistinguishable from noise";
    riskFlags.push("noise_edge");
  }

  return {
    state: "AMBER",
    diagnosis,
    instruction,
    riskFlags,
  };
}

/**
 * Build final scoring result
 */
export function buildScoringResult(metrics: Metrics): ScoringResult {
  const classifierState = classify(metrics);

  return {
    state: classifierState.state,
    metrics: {
      clv: metrics.clv_avg,
      xroi: metrics.xroi,
      roi: metrics.roi,
      confidence: metrics.confidence,
      z: metrics.z_score,
    },
    diagnosis: classifierState.diagnosis,
    instruction: classifierState.instruction,
    riskFlags: classifierState.riskFlags,
  };
}
