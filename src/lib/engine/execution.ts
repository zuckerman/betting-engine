import { PredictionBet } from "./types";
import { shouldBetAdvanced } from "./filter";
import { calculateKelly } from "./kelly";

export interface ExecutionDecision {
  action: "BET" | "REJECT";
  reason: string;
  stake: number;
  edge?: number;
  kelly?: {
    fraction: number;
    fractional: number;
  };
}

/**
 * Full execution decision: filter + Kelly sizing
 * This is what actually determines if a bet executes
 */
export function evaluateBet(
  bet: PredictionBet,
  bankroll: number
): ExecutionDecision {
  // Step 1: Filter check
  const filter = shouldBetAdvanced(bet);

  if (!filter.allow) {
    return {
      action: "REJECT",
      reason: filter.reason,
      stake: 0,
    };
  }

  // Step 2: Kelly sizing
  const kelly = calculateKelly(bet, bankroll);

  if (kelly.stake <= 0) {
    return {
      action: "REJECT",
      reason: "Kelly stake too small",
      stake: 0,
    };
  }

  return {
    action: "BET",
    reason: "Approved and sized",
    stake: kelly.stake,
    edge: bet.edge || undefined,
    kelly: {
      fraction: kelly.f,
      fractional: kelly.fractional,
    },
  };
}

/**
 * Risk-aware execution with portfolio constraints
 */
export interface PortfolioConstraints {
  maxDailyExposure: number; // Max % of bankroll to risk today
  maxDrawdown: number; // Max portfolio drawdown allowed (e.g., 0.2 = 20%)
  minEdge: number; // Override minimum edge
}

export function evaluateBetWithConstraints(
  bet: PredictionBet,
  bankroll: number,
  currentDailyStake: number,
  currentDrawdown: number,
  constraints: PortfolioConstraints
): ExecutionDecision {
  // Check daily exposure
  const maxDailyRisk = bankroll * constraints.maxDailyExposure;
  if (currentDailyStake + bet.stake > maxDailyRisk) {
    return {
      action: "REJECT",
      reason: `Daily exposure limit exceeded: ${(currentDailyStake + bet.stake).toFixed(0)} > ${maxDailyRisk.toFixed(0)}`,
      stake: 0,
    };
  }

  // Check drawdown
  if (currentDrawdown > constraints.maxDrawdown) {
    return {
      action: "REJECT",
      reason: `Drawdown limit exceeded: ${(currentDrawdown * 100).toFixed(1)}% > ${(constraints.maxDrawdown * 100).toFixed(0)}%`,
      stake: 0,
    };
  }

  // Proceed with normal evaluation
  return evaluateBet(bet, bankroll);
}

/**
 * Batch evaluation - evaluate multiple bets at once
 */
export function evaluateBets(
  bets: PredictionBet[],
  bankroll: number
): ExecutionDecision[] {
  return bets.map((bet) => evaluateBet(bet, bankroll));
}

/**
 * Aggregate execution report
 */
export interface ExecutionReport {
  totalBets: number;
  approved: number;
  rejected: number;
  totalStake: number;
  avgStake: number;
  totalEdge: number;
  avgEdge: number;
  decisions: ExecutionDecision[];
}

export function generateExecutionReport(
  bets: PredictionBet[],
  bankroll: number
): ExecutionReport {
  const decisions = evaluateBets(bets, bankroll);

  const approved = decisions.filter((d) => d.action === "BET");
  const rejected = decisions.filter((d) => d.action === "REJECT");

  const totalStake = approved.reduce((sum, d) => sum + d.stake, 0);
  const avgStake = approved.length > 0 ? totalStake / approved.length : 0;

  const totalEdge = approved.reduce((sum, d) => sum + (d.edge || 0), 0);
  const avgEdge = approved.length > 0 ? totalEdge / approved.length : 0;

  return {
    totalBets: bets.length,
    approved: approved.length,
    rejected: rejected.length,
    totalStake,
    avgStake,
    totalEdge,
    avgEdge,
    decisions,
  };
}
