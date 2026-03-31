/**
 * Safety Check Layer
 * CRITICAL: These checks run BEFORE any bet is placed
 * If ANY check fails → execution is blocked
 */

export interface SafetyContext {
  drawdown: number; // Current drawdown (0-1)
  dailyLoss: number; // Today's losses (0-1 of bankroll)
  state: "BLACK" | "RED" | "AMBER" | "GREEN"; // System health
  modelCalibrationError: number; // How wrong model has been
  recentWinRate: number; // Win rate on last 20 bets
  totalBetsPlaced: number; // How many bets today
  maxDailyBets: number; // Hard limit on bets per day
  bankroll: number; // Current bankroll
  minBankroll: number; // Stop if below this
}

/**
 * Core safety checks that MUST pass
 */
export function safetyChecks(context: SafetyContext): {
  passed: boolean;
  failedChecks: string[];
  recommendations: string[];
} {
  const failed: string[] = [];
  const recommendations: string[] = [];

  // Check 1: Drawdown limit
  // If down > 20%, stop everything
  if (context.drawdown > 0.2) {
    failed.push("Drawdown exceeds 20% - emergency stop triggered");
    recommendations.push("Review losses, check calibration, consider pause");
  }

  // Check 2: Daily loss limit
  // If lost > 10% today, stop for the day
  if (context.dailyLoss > 0.1) {
    failed.push("Daily loss limit exceeded (10%) - no more bets today");
    recommendations.push("Wait until tomorrow, analyze what went wrong");
  }

  // Check 3: System state
  // RED state = known issue, stop execution
  if (context.state === "RED") {
    failed.push("System in RED state - known issue detected");
    recommendations.push("Check Telegram alerts, investigate problem");
  }

  // Check 4: Calibration error too high
  // If model is > 15% off, reduce aggression
  if (context.modelCalibrationError > 0.15) {
    failed.push("Model calibration error too high (>15%) - requires adjustment");
    recommendations.push("Review recent results, may need to retrain");
  }

  // Check 5: Recent performance crash
  // If win rate < 40% on last 20 bets, something is wrong
  if (context.recentWinRate < 0.4 && context.totalBetsPlaced > 20) {
    failed.push("Recent win rate below 40% - possible model drift");
    recommendations.push("Pause and investigate calibration");
  }

  // Check 6: Daily bet limit
  // Hard cap on how many bets per day
  if (context.totalBetsPlaced >= context.maxDailyBets) {
    failed.push(`Daily bet limit reached (${context.maxDailyBets} bets)`);
    recommendations.push("Wait for next day");
  }

  // Check 7: Bankroll check
  // If bankroll dips below minimum, stop
  if (context.bankroll < context.minBankroll) {
    failed.push("Bankroll below minimum threshold");
    recommendations.push("Deposit funds or stop trading");
  }

  return {
    passed: failed.length === 0,
    failedChecks: failed,
    recommendations,
  };
}

/**
 * Get safety status for UI
 */
export function getSafetyStatus(context: SafetyContext): {
  status: "🟢 SAFE" | "🟡 CAUTION" | "🔴 BLOCKED";
  reason: string;
  canExecute: boolean;
} {
  const check = safetyChecks(context);

  if (!check.passed) {
    return {
      status: "🔴 BLOCKED",
      reason: check.failedChecks[0] || "Unknown safety issue",
      canExecute: false,
    };
  }

  // If checks pass, determine overall caution level
  let status: "🟢 SAFE" | "🟡 CAUTION" | "🔴 BLOCKED" = "🟢 SAFE";
  let reason = "All systems clear";

  if (context.drawdown > 0.15) {
    status = "🟡 CAUTION";
    reason = "Approaching drawdown limit";
  }

  if (context.dailyLoss > 0.07) {
    status = "🟡 CAUTION";
    reason = "Approaching daily loss limit";
  }

  if (context.modelCalibrationError > 0.1) {
    status = "🟡 CAUTION";
    reason = "Model reliability declining";
  }

  return {
    status,
    reason,
    canExecute: true,
  };
}

/**
 * Default safety context (conservative)
 */
export function getDefaultContext(
  currentBankroll: number,
  todaysBets: number
): SafetyContext {
  return {
    drawdown: 0,
    dailyLoss: 0,
    state: "GREEN",
    modelCalibrationError: 0,
    recentWinRate: 0.55,
    totalBetsPlaced: todaysBets,
    maxDailyBets: 50, // Hard cap: 50 bets per day max
    bankroll: currentBankroll,
    minBankroll: currentBankroll * 0.5, // Stop if lose > 50%
  };
}
