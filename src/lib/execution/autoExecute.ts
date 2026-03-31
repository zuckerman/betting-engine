/**
 * Auto Execution Engine
 * Handles execution decisions with multiple control modes
 * CRITICAL: Safety layer must pass before execution
 */

import { getBroker, BetOrder, ExecutionResult } from "./broker";
import { SafetyContext, getSafetyStatus } from "./safetyChecks";
import { AdaptiveDecision } from "../engine/adaptiveExecution";

export type ControlMode = "MANUAL" | "SEMI_AUTO" | "FULL_AUTO";

export interface ExecutionConfig {
  mode: ControlMode;
  safetyContext: SafetyContext;
  requireConfirmation?: boolean; // For semi-auto
}

export interface ExecutionLog {
  timestamp: number;
  fixture_id: string | number;
  decision: AdaptiveDecision;
  safetyStatus: ReturnType<typeof getSafetyStatus>;
  mode: ControlMode;
  execution?: ExecutionResult;
  reason: string;
}

/**
 * Global kill switch
 */
let killSwitch = false;

export function setKillSwitch(active: boolean): void {
  killSwitch = active;
  console.log(`[EXECUTION] Kill switch: ${active ? "ACTIVATED" : "DEACTIVATED"}`);
}

export function isKillSwitchActive(): boolean {
  return killSwitch;
}

/**
 * Main execution function
 */
export async function autoExecute(
  decision: AdaptiveDecision,
  config: ExecutionConfig
): Promise<ExecutionLog> {
  const timestamp = Date.now();
  const safetyStatus = getSafetyStatus(config.safetyContext);

  // Check 1: Kill switch
  if (killSwitch) {
    return {
      timestamp,
      fixture_id: decision.originalEdge,
      decision,
      safetyStatus,
      mode: config.mode,
      reason: "REJECTED: Kill switch active",
    };
  }

  // Check 2: Safety checks must pass
  if (!safetyStatus.canExecute) {
    return {
      timestamp,
      fixture_id: decision.originalEdge,
      decision,
      safetyStatus,
      mode: config.mode,
      reason: `BLOCKED: ${safetyStatus.reason}`,
    };
  }

  // Check 3: Only execute on BET decisions
  if (decision.action !== "BET") {
    return {
      timestamp,
      fixture_id: decision.originalEdge,
      decision,
      safetyStatus,
      mode: config.mode,
      reason: `REJECTED: Decision action is ${decision.action}`,
    };
  }

  // Route to execution based on mode
  switch (config.mode) {
    case "MANUAL":
      return handleManualMode(decision, config, safetyStatus, timestamp);

    case "SEMI_AUTO":
      return handleSemiAutoMode(decision, config, safetyStatus, timestamp);

    case "FULL_AUTO":
      return handleFullAutoMode(decision, config, safetyStatus, timestamp);

    default:
      return {
        timestamp,
        fixture_id: decision.originalEdge,
        decision,
        safetyStatus,
        mode: config.mode,
        reason: "ERROR: Unknown execution mode",
      };
  }
}

/**
 * MANUAL mode: Alert only, user places bets
 */
function handleManualMode(
  decision: AdaptiveDecision,
  _config: ExecutionConfig,
  safetyStatus: ReturnType<typeof getSafetyStatus>,
  timestamp: number
): ExecutionLog {
  return {
    timestamp,
    fixture_id: decision.originalEdge,
    decision,
    safetyStatus,
    mode: "MANUAL",
    reason: "ALERT: Manual confirmation required",
  };
}

/**
 * SEMI_AUTO mode: System sizes stake, user confirms
 */
async function handleSemiAutoMode(
  decision: AdaptiveDecision,
  config: ExecutionConfig,
  safetyStatus: ReturnType<typeof getSafetyStatus>,
  timestamp: number
): Promise<ExecutionLog> {
  // In production, this would send a Telegram/email and wait for confirmation
  // For now, we'll auto-confirm but log that it requires confirmation

  const log: ExecutionLog = {
    timestamp,
    fixture_id: decision.originalEdge,
    decision,
    safetyStatus,
    mode: "SEMI_AUTO",
    reason: "PENDING: Awaiting user confirmation",
  };

  // TODO: In production, wait for user confirmation here
  // For testing, auto-confirm after brief delay
  if (config.requireConfirmation === false) {
    // Auto-confirm if explicitly allowed
    return await executeActually(decision, log);
  }

  return log;
}

/**
 * FULL_AUTO mode: System executes immediately
 */
async function handleFullAutoMode(
  decision: AdaptiveDecision,
  _config: ExecutionConfig,
  safetyStatus: ReturnType<typeof getSafetyStatus>,
  timestamp: number
): Promise<ExecutionLog> {
  const log: ExecutionLog = {
    timestamp,
    fixture_id: decision.originalEdge,
    decision,
    safetyStatus,
    mode: "FULL_AUTO",
    reason: "EXECUTING",
  };

  return await executeActually(decision, log);
}

/**
 * Actually place the bet
 */
async function executeActually(
  decision: AdaptiveDecision,
  log: ExecutionLog
): Promise<ExecutionLog> {
  try {
    const broker = getBroker();

    const order: BetOrder = {
      fixture_id: log.fixture_id,
      market: "home_win", // TODO: Map from decision
      stake: decision.stake,
      odds: 2.0, // TODO: Get from market
      metadata: {
        edge: decision.adjustedEdge,
        risk_level: decision.riskLevel,
        model_probability: decision.adjustedProb,
      },
    };

    const result = await broker.placeBet(order);

    log.execution = result;
    log.reason = `EXECUTED: Bet ${result.bet_id} placed`;

    return log;
  } catch (error) {
    log.reason = `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`;
    return log;
  }
}

/**
 * Get execution history
 */
const executionHistory: ExecutionLog[] = [];

export function logExecution(log: ExecutionLog): void {
  executionHistory.push(log);
  
  // Keep only last 1000 logs
  if (executionHistory.length > 1000) {
    executionHistory.shift();
  }
}

export function getExecutionHistory(limit: number = 50): ExecutionLog[] {
  return executionHistory.slice(-limit);
}

export function getExecutionStats(): {
  total: number;
  executed: number;
  blocked: number;
  pending: number;
  totalStaked: number;
} {
  const stats = {
    total: executionHistory.length,
    executed: 0,
    blocked: 0,
    pending: 0,
    totalStaked: 0,
  };

  for (const log of executionHistory) {
    if (log.execution?.status === "placed") {
      stats.executed++;
      stats.totalStaked += log.execution.stake || 0;
    } else if (log.reason.includes("BLOCKED")) {
      stats.blocked++;
    } else if (log.reason.includes("PENDING")) {
      stats.pending++;
    }
  }

  return stats;
}

/**
 * Clear execution history (for testing)
 */
export function clearExecutionHistory(): void {
  executionHistory.length = 0;
}
