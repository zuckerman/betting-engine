/**
 * Adaptive Execution Engine
 * Combines probability adjustment, segment weighting, and adaptive filtering
 * This is the core of the self-correcting system
 */

import { PredictionBet } from "./types";
import { adjustProbabilityByConfidence } from "./adjustment";
import { SegmentWeight } from "./segmentWeights";
import { adaptiveThreshold, adaptiveKelly, AdaptiveContext } from "./adaptiveFilter";
import { calculateEdge } from "./edge";

export interface AdaptiveDecision {
  action: "BET" | "REJECT";
  reason: string;

  // Original
  originalProb: number;
  originalEdge: number;

  // Adjusted
  adjustedProb: number;
  adjustedEdge: number;

  // Context
  calibrationError: number;
  segmentWeight: number;
  dynamicThreshold: number;

  // Execution
  stake: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Evaluate bet with full adaptive system
 *
 * Process:
 * 1. Adjust probability based on calibration error
 * 2. Calculate adjusted edge
 * 3. Apply segment weighting
 * 4. Use dynamic thresholds
 * 5. Size with weighted Kelly
 * 6. Return full decision
 */
export function evaluateAdaptiveBet(
  bet: PredictionBet,
  bankroll: number,
  context: AdaptiveContext,
  segmentWeight?: SegmentWeight
): AdaptiveDecision {
  // Step 1: Original metrics
  const originalProb = bet.model_probability;
  const originalEdgeResult = calculateEdge(bet);
  const originalEdge = originalEdgeResult.edge;

  // Step 2: Adjust probability based on calibration error
  const adjustedProb = adjustProbabilityByConfidence(
    originalProb,
    context.calibrationError,
    context.recentAccuracy
  );

  // Step 3: Create adjusted bet and recalculate edge
  const adjustedBet: PredictionBet = {
    ...bet,
    model_probability: adjustedProb,
  };
  const adjustedEdgeResult = calculateEdge(adjustedBet);
  const adjustedEdge = adjustedEdgeResult.edge;

  // Step 4: Get segment weight
  const weight = segmentWeight?.weight ?? context.segmentWeight;

  // Step 5: Dynamic threshold
  const threshold = adaptiveThreshold(context);

  // Step 6: Should bet based on adjusted edge?
  if (adjustedEdge < threshold) {
    return {
      action: "REJECT",
      reason: `Adjusted edge ${(adjustedEdge * 100).toFixed(2)}% below threshold ${(threshold * 100).toFixed(2)}%`,
      originalProb,
      originalEdge,
      adjustedProb,
      adjustedEdge,
      calibrationError: context.calibrationError,
      segmentWeight: weight,
      dynamicThreshold: threshold,
      stake: 0,
      riskLevel: "LOW",
    };
  }

  // Step 7: Calculate weighted stake
  const stake = adaptiveKelly(adjustedBet, bankroll, context);

  // Determine risk level
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
  if (context.calibrationError > 0.1) {
    riskLevel = "HIGH"; // Unreliable model
  } else if (context.calibrationError < 0.02) {
    riskLevel = "LOW"; // Reliable model
  }

  return {
    action: "BET",
    reason: `Adaptive edge ${(adjustedEdge * 100).toFixed(2)}% with segment weight ${weight.toFixed(2)}x`,
    originalProb,
    originalEdge,
    adjustedProb,
    adjustedEdge,
    calibrationError: context.calibrationError,
    segmentWeight: weight,
    dynamicThreshold: threshold,
    stake,
    riskLevel,
  };
}

/**
 * Build context from performance metrics
 */
export interface ContextSource {
  totalCalibrationError: number;
  recentBets: { won: boolean; modelProb: number }[];
  segmentWeights: Map<string, number>;
}

export function buildAdaptiveContext(source: ContextSource): AdaptiveContext {
  // Calibration error from performance
  const calibrationError = Math.abs(source.totalCalibrationError);

  // Recent accuracy (last 50 bets)
  const recentAccuracy =
    source.recentBets.length > 0
      ? source.recentBets.filter((b) => b.won).length /
        source.recentBets.length
      : 0.5;

  // Segment weight average
  const segmentWeights = Array.from(source.segmentWeights.values());
  const segmentWeight =
    segmentWeights.length > 0
      ? segmentWeights.reduce((sum, w) => sum + w, 0) / segmentWeights.length
      : 1.0;

  return {
    calibrationError,
    recentAccuracy,
    segmentWeight,
  };
}

/**
 * Batch evaluate multiple bets
 */
export function evaluateAdaptiveBets(
  bets: PredictionBet[],
  bankroll: number,
  context: AdaptiveContext,
  segmentWeights?: Map<string, SegmentWeight>
): AdaptiveDecision[] {
  return bets.map((bet) => {
    const segmentWeight = segmentWeights?.get(bet.id);
    return evaluateAdaptiveBet(bet, bankroll, context, segmentWeight);
  });
}

/**
 * Generate adaptive execution report
 */
export interface AdaptiveReport {
  totalBets: number;
  acceptedBets: number;
  totalStake: number;
  decisions: AdaptiveDecision[];
  summary: {
    acceptanceRate: number;
    avgAdjustedEdge: number;
    avgAdjustmentAmount: number;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
    };
  };
}

export function generateAdaptiveReport(
  decisions: AdaptiveDecision[]
): AdaptiveReport {
  const accepted = decisions.filter((d) => d.action === "BET");
  const adjustments = decisions.map(
    (d) => Math.abs(d.adjustedProb - d.originalProb)
  );
  const adjustedEdges = accepted.map((d) => d.adjustedEdge);

  const risks = {
    low: decisions.filter((d) => d.riskLevel === "LOW").length,
    medium: decisions.filter((d) => d.riskLevel === "MEDIUM").length,
    high: decisions.filter((d) => d.riskLevel === "HIGH").length,
  };

  return {
    totalBets: decisions.length,
    acceptedBets: accepted.length,
    totalStake: accepted.reduce((sum, d) => sum + d.stake, 0),
    decisions,
    summary: {
      acceptanceRate: accepted.length / decisions.length,
      avgAdjustedEdge:
        adjustedEdges.length > 0
          ? adjustedEdges.reduce((sum, e) => sum + e, 0) / adjustedEdges.length
          : 0,
      avgAdjustmentAmount:
        adjustments.length > 0
          ? adjustments.reduce((sum, a) => sum + a, 0) / adjustments.length
          : 0,
      riskDistribution: risks,
    },
  };
}
