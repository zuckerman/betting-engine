/**
 * Strategy System
 * Track and score strategies for capital allocation
 */

import { BettorState } from "./types";

export interface Strategy {
  id: string;
  name: string;
  description?: string;

  // Performance metrics
  bets: number;
  wins: number;
  roi: number;
  clv: number;
  edge: number;
  totalProfit: number;
  totalStake: number;

  // Risk metrics
  drawdown: number;
  winRate: number;
}

/**
 * Score strategy (0-100)
 * Combines ROI, CLV, edge, with risk penalty
 */
export function scoreStrategy(strategy: Strategy): number {
  // Minimum sample size check
  if (strategy.bets < 20) {
    return 30; // Low score until proven
  }

  // Base score from profitability metrics
  const roiScore = Math.min(strategy.roi * 500, 40); // Max 40
  const clvScore = Math.min(strategy.clv * 500, 30); // Max 30
  const edgeScore = Math.min(strategy.edge * 500, 20); // Max 20

  // Risk penalty
  const drawdownPenalty = strategy.drawdown * 50;

  const totalScore = roiScore + clvScore + edgeScore - drawdownPenalty;

  return Math.max(0, Math.min(100, totalScore));
}

/**
 * Classify strategy health
 */
export function classifyStrategy(strategy: Strategy): BettorState {
  if (strategy.bets < 20) return "BLACK"; // Not enough data

  if (strategy.roi < -0.05 && strategy.clv < 0) return "RED"; // Losing

  if (strategy.roi > 0.05 && strategy.clv > 0.01) return "GREEN"; // Winning

  return "AMBER"; // Mixed
}

/**
 * Get allocation recommendation (0-1)
 * Based on strategy score
 */
export function getAllocationWeight(
  strategies: Strategy[]
): Map<string, number> {
  const scores = strategies.map((s) => ({
    id: s.id,
    score: scoreStrategy(s),
  }));

  // Filter out negative scores
  const positiveScores = scores.filter((s) => s.score > 0);

  if (positiveScores.length === 0) {
    // Return equal weight if all negative
    const equal = 1 / strategies.length;
    const map = new Map<string, number>();
    strategies.forEach((s) => map.set(s.id, equal));
    return map;
  }

  const totalScore = positiveScores.reduce((sum, s) => sum + s.score, 0);

  const weights = new Map<string, number>();
  strategies.forEach((s) => {
    const score = scores.find((sc) => sc.id === s.id)?.score ?? 0;
    const weight = score > 0 ? score / totalScore : 0;
    weights.set(s.id, weight);
  });

  return weights;
}
