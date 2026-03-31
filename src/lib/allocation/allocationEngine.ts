/**
 * Capital Allocation Engine
 * Allocates capital across different betting strategies
 */

import { Strategy } from "../engine/strategy";

export interface StrategyAllocation {
  strategy_id: string;
  allocation_weight: number; // 0-1
  allocated_capital: number;
  status: "ACTIVE" | "REDUCED" | "PAUSED" | "STOPPED";
}

export interface AllocationPlan {
  total_capital: number;
  allocations: StrategyAllocation[];
  timestamp: number;
  reason: string;
}

/**
 * Calculate allocation based on strategy performance
 */
export function calculateAllocation(
  strategies: Strategy[],
  totalCapital: number
): AllocationPlan {
  // Score each strategy
  const scores = strategies.map((s) => ({
    id: s.id,
    score: scoreStrategyForAllocation(s),
  }));

  // Separate winners
  const winners = scores.filter((s) => s.score > 0);

  const totalScore = winners.reduce((sum, s) => sum + s.score, 0);

  const allocations: StrategyAllocation[] = [];

  for (const strategy of strategies) {
    const score = scores.find((s) => s.id === strategy.id)?.score ?? 0;

    let weight = 0;
    let status: "ACTIVE" | "REDUCED" | "PAUSED" | "STOPPED" = "ACTIVE";

    if (score > 0 && totalScore > 0) {
      weight = score / totalScore;
      status = "ACTIVE";
    } else if (score > 0) {
      // Winning but total is negative
      weight = 0.1; // Small allocation
      status = "REDUCED";
    } else if (score < -0.1) {
      // Losing badly
      weight = 0; // No capital
      status = "STOPPED";
    } else {
      weight = 0.05; // Probe position
      status = "PAUSED";
    }

    allocations.push({
      strategy_id: strategy.id,
      allocation_weight: weight,
      allocated_capital: weight * totalCapital,
      status,
    });
  }

  // Normalize weights to ensure sum = 1
  const totalWeight = allocations.reduce((sum, a) => sum + a.allocation_weight, 0);
  if (totalWeight > 0) {
    for (const alloc of allocations) {
      alloc.allocation_weight /= totalWeight;
      alloc.allocated_capital = (alloc.allocation_weight * totalCapital);
    }
  }

  return {
    total_capital: totalCapital,
    allocations,
    timestamp: Date.now(),
    reason: `Allocation based on ${strategies.length} strategies`,
  };
}

/**
 * Score strategy (similar to strategy.ts but with allocation focus)
 */
function scoreStrategyForAllocation(strategy: Strategy): number {
  // Minimum sample size
  if (strategy.bets < 20) {
    return 0; // No allocation until proven
  }

  // Core profitability score
  const roiScore = strategy.roi > 0 ? Math.min(strategy.roi * 500, 40) : 0;
  const clvScore = strategy.clv > 0 ? Math.min(strategy.clv * 500, 30) : 0;
  const edgeScore = strategy.edge > 0 ? Math.min(strategy.edge * 500, 20) : 0;

  // Risk penalty (drawdown)
  const drawdownPenalty = strategy.drawdown * 50;

  // Win rate bonus (consistency)
  const consistencyBonus = strategy.winRate > 0.55 ? 10 : 0;

  const score = roiScore + clvScore + edgeScore + consistencyBonus - drawdownPenalty;

  return Math.max(0, score);
}

/**
 * Rebalance allocation based on recent performance
 */
export function rebalanceAllocation(
  current: AllocationPlan,
  updated: AllocationPlan
): {
  changes: StrategyAllocation[];
  rebalance_reason: string;
  rebalance_severity: "MINOR" | "MODERATE" | "MAJOR";
} {
  const changes: StrategyAllocation[] = [];
  let maxChange = 0;

  for (const updatedAlloc of updated.allocations) {
    const currentAlloc = current.allocations.find(
      (a) => a.strategy_id === updatedAlloc.strategy_id
    );

    if (!currentAlloc) continue;

    const change = Math.abs(updatedAlloc.allocation_weight - currentAlloc.allocation_weight);
    maxChange = Math.max(maxChange, change);

    if (change > 0.01) {
      // Threshold for reporting
      changes.push(updatedAlloc);
    }
  }

  let severity: "MINOR" | "MODERATE" | "MAJOR" = "MINOR";
  if (maxChange > 0.2) {
    severity = "MAJOR";
  } else if (maxChange > 0.1) {
    severity = "MODERATE";
  }

  return {
    changes,
    rebalance_reason: `Max allocation change: ${(maxChange * 100).toFixed(1)}%`,
    rebalance_severity: severity,
  };
}

/**
 * Generate allocation report
 */
export interface AllocationReport {
  plan: AllocationPlan;
  summary: {
    active_strategies: number;
    allocated_strategies: number;
    paused_strategies: number;
    stopped_strategies: number;
    capital_utilization: number; // 0-1
    concentration: number; // 0-1, 1 = all in one
  };
}

export function generateAllocationReport(plan: AllocationPlan): AllocationReport {
  const active = plan.allocations.filter((a) => a.status === "ACTIVE").length;
  const allocated = plan.allocations.filter((a) => a.allocation_weight > 0).length;
  const paused = plan.allocations.filter((a) => a.status === "PAUSED").length;
  const stopped = plan.allocations.filter((a) => a.status === "STOPPED").length;

  // Utilization = sum of allocated weights
  const utilization = plan.allocations.reduce(
    (sum, a) => sum + a.allocation_weight,
    0
  );

  // Concentration = HHI (Herfindahl-Hirschman Index)
  // Higher = more concentrated, 1 = all one strategy
  const concentration = plan.allocations.reduce(
    (sum, a) => sum + Math.pow(a.allocation_weight, 2),
    0
  );

  return {
    plan,
    summary: {
      active_strategies: active,
      allocated_strategies: allocated,
      paused_strategies: paused,
      stopped_strategies: stopped,
      capital_utilization: Math.min(utilization, 1),
      concentration,
    },
  };
}

/**
 * Find under-allocated strategies (low capital for good performance)
 */
export function findUnderfundedStrategies(
  strategies: Strategy[],
  allocation: AllocationPlan
): Strategy[] {
  return strategies.filter((strategy) => {
    const alloc = allocation.allocations.find((a) => a.strategy_id === strategy.id);
    if (!alloc) return false;

    // If strategy is highly profitable but allocation is low, it's underfunded
    const profitabilityScore = (strategy.roi || 0) + (strategy.clv || 0);
    const allocationScore = alloc.allocation_weight;

    return profitabilityScore > 0.1 && allocationScore < 0.2;
  });
}
