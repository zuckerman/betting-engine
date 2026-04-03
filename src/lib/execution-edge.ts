/**
 * EXECUTION EDGE SYSTEM
 * 
 * Optimizes WHEN and HOW you enter the market
 * - Timing windows
 * - Price drift detection
 * - Entry triggers
 * - Split entry strategy
 * - Execution scoring
 */

export interface TimingWindow {
  hoursBeforeKickoff: number;
  quality: "early" | "optimal" | "late";
  recommendation: string;
}

export interface PriceHistory {
  timestamp: number;
  price: number;
}

export interface EntryTrigger {
  triggered: boolean;
  reason: string;
  confidence: number; // 0-1
  suggestedStakeFraction: number; // 0-1 (what % of total to bet)
}

export interface ExecutionMetrics {
  expectedOdds: number;
  actualOdds: number;
  slippage: number;
  slippagePercent: number;
  executedAt: number;
}

const OPTIMAL_WINDOW = {
  MIN_HOURS: 1,    // 1 hour before KO minimum
  MAX_HOURS: 6,    // 6 hours before KO maximum
};

/**
 * Calculate time to kickoff in hours
 */
export function hoursToKickoff(kickoffTime: number): number {
  const now = Date.now();
  const msToKickoff = kickoffTime - now;
  return msToKickoff / (1000 * 60 * 60);
}

/**
 * Assess timing quality
 */
export function assessTimingQuality(
  hoursRemaining: number
): "early" | "optimal" | "late" {
  if (hoursRemaining > OPTIMAL_WINDOW.MAX_HOURS) return "early";
  if (hoursRemaining < OPTIMAL_WINDOW.MIN_HOURS) return "late";
  return "optimal";
}

/**
 * Get timing recommendation
 */
export function getTimingRecommendation(
  hoursRemaining: number
): TimingWindow {
  const quality = assessTimingQuality(hoursRemaining);

  const recommendations = {
    early:
      "🕐 Too early. Market still inefficient. Wait for better liquidity.",
    optimal: "✅ OPTIMAL TIMING. 1-6h window. Consider entering.",
    late: "🏁 Too close to kickoff. Market is sharp. Don't risk.",
  };

  return {
    hoursBeforeKickoff: hoursRemaining,
    quality,
    recommendation: recommendations[quality],
  };
}

/**
 * Detect price movement direction and momentum
 */
export function analyzePriceDrift(history: PriceHistory[]): {
  direction: "rising" | "falling" | "stable";
  momentum: number; // -1 to 1
  percentChange: number;
} {
  if (history.length < 2) {
    return {
      direction: "stable",
      momentum: 0,
      percentChange: 0,
    };
  }

  const oldest = history[0];
  const newest = history[history.length - 1];

  const change = newest.price - oldest.price;
  const percentChange = change / oldest.price;

  let direction: "rising" | "falling" | "stable";
  if (Math.abs(percentChange) < 0.005) {
    direction = "stable"; // <0.5% = stable
  } else if (change > 0) {
    direction = "rising";
  } else {
    direction = "falling";
  }

  return {
    direction,
    momentum: percentChange,
    percentChange,
  };
}

/**
 * Decide whether to enter based on entry odds vs current odds
 */
export function shouldEnterNow({
  entryOdds,
  currentOdds,
  edge,
  hoursRemaining,
}: {
  entryOdds: number;
  currentOdds: number;
  edge: number; // CLV percentage (e.g., 0.05 = 5%)
  hoursRemaining: number;
}): EntryTrigger {
  // No edge = don't enter
  if (edge < 0.02) {
    return {
      triggered: false,
      reason: "Edge too small (< 2%)",
      confidence: 0,
      suggestedStakeFraction: 0,
    };
  }

  // Outside timing window = wait
  const timing = assessTimingQuality(hoursRemaining);
  if (timing !== "optimal") {
    return {
      triggered: false,
      reason: `Outside optimal window (${hoursRemaining.toFixed(1)}h)`,
      confidence: 0,
      suggestedStakeFraction: 0,
    };
  }

  // Check if price is improving or deteriorating
  const priceImproving = currentOdds < entryOdds; // better odds than expected
  const priceDeteriorating = currentOdds > entryOdds; // worse odds

  // RULE: If price is falling (deteriorating), enter immediately
  // This means value is being eaten - opportunity closing
  if (priceDeteriorating) {
    return {
      triggered: true,
      reason: "Price worsening! Value disappearing. ENTER NOW.",
      confidence: 0.9,
      suggestedStakeFraction: 1.0, // full stake
    };
  }

  // RULE: If price is stable or rising, consider split entry
  // Rising = wait for better price, but take first tranche
  if (priceImproving || Math.abs(currentOdds - entryOdds) < 0.02) {
    return {
      triggered: true,
      reason: "Price favorable or stable. Consider partial entry.",
      confidence: 0.7,
      suggestedStakeFraction: 0.5, // partial stake (split entry strategy)
    };
  }

  return {
    triggered: false,
    reason: "Inconclusive. Wait for clearer signal.",
    confidence: 0.3,
    suggestedStakeFraction: 0,
  };
}

/**
 * Split entry strategy - divide stake over time
 */
export function calculateSplitEntry(
  totalStake: number,
  tranche: "first" | "second"
): number {
  const firstTranche = totalStake * 0.5;
  const secondTranche = totalStake * 0.5;

  return tranche === "first" ? firstTranche : secondTranche;
}

/**
 * Calculate execution slippage (difference between expected and actual price)
 */
export function calculateSlippage(
  expectedOdds: number,
  actualOdds: number
): ExecutionMetrics {
  const slippage = actualOdds - expectedOdds;
  const slippagePercent = (slippage / expectedOdds) * 100;

  return {
    expectedOdds,
    actualOdds,
    slippage,
    slippagePercent,
    executedAt: Date.now(),
  };
}

/**
 * Execution score (0-100) - how good was this execution?
 */
export function scoreExecution({
  timingScore, // 0-100 (100 = perfect timing)
  driftScore,  // 0-100 (100 = perfect drift direction)
  spreadScore, // 0-100 (100 = no spread)
}: {
  timingScore: number;
  driftScore: number;
  spreadScore: number;
}): number {
  // Weighted average: timing (40%), drift (40%), spread (20%)
  const score =
    (timingScore * 0.4 +
      driftScore * 0.4 +
      spreadScore * 0.2) / 100;

  return Math.round(score * 100);
}

/**
 * Check if market is in acceptable condition for betting
 */
export function validateMarketConditions({
  spread,
  liquidity,
  hoursRemaining,
}: {
  spread: number; // as decimal (0.01 = 1%)
  liquidity: number; // total matched (0 for no check)
  hoursRemaining: number;
}): {
  isGood: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check spread (sharp books should have <3% spread)
  if (spread > 0.03) {
    issues.push(`Spread too wide (${(spread * 100).toFixed(1)}%)`);
  }

  // Check timing (don't bet within 30 mins of KO)
  if (hoursRemaining < 0.5) {
    issues.push("Too close to kickoff (<30 mins)");
  }

  // Check timing (don't bet >7 hours early)
  if (hoursRemaining > 7) {
    issues.push("Too early - market not formed yet");
  }

  return {
    isGood: issues.length === 0,
    issues,
  };
}

/**
 * Line shopping - check if your odds are best available
 */
export function isLineShoppingFavorable({
  yourOdds,
  bestMarketOdds,
  tolerance,
}: {
  yourOdds: number;
  bestMarketOdds: number;
  tolerance?: number; // default 0.01 = 1%
}): boolean {
  const tol = tolerance || 0.01;
  return yourOdds >= bestMarketOdds - tol;
}

/**
 * Calculate timing score (0-100)
 */
export function calculateTimingScore(hoursRemaining: number): number {
  const optimal = (OPTIMAL_WINDOW.MIN_HOURS + OPTIMAL_WINDOW.MAX_HOURS) / 2;

  if (hoursRemaining < 0 || hoursRemaining > 24) return 0; // invalid

  if (hoursRemaining < OPTIMAL_WINDOW.MIN_HOURS) {
    return 0; // too late
  }

  if (hoursRemaining > OPTIMAL_WINDOW.MAX_HOURS) {
    return Math.max(0, 100 - (hoursRemaining - OPTIMAL_WINDOW.MAX_HOURS) * 5);
  }

  // In optimal window - peak score in middle
  const distanceFromOptimal = Math.abs(hoursRemaining - optimal);
  return Math.max(0, 100 - distanceFromOptimal * 20);
}

/**
 * Calculate drift score (0-100)
 */
export function calculateDriftScore(direction: "rising" | "falling" | "stable"): number {
  if (direction === "falling") return 100; // best - value disappearing
  if (direction === "stable") return 70;   // good - value holding
  return 0;                                 // bad - worse odds coming
}

/**
 * Get execution summary
 */
export function summarizeExecution({
  edge,
  timing,
  drift,
  spread,
}: {
  edge: number;
  timing: number;
  drift: "rising" | "falling" | "stable";
  spread: number;
}): {
  recommendation: "ENTER" | "WAIT" | "SKIP";
  score: number;
  reason: string;
} {
  const timingScore = calculateTimingScore(timing);
  const driftScore = calculateDriftScore(drift);
  const spreadScore = Math.max(0, 100 - spread * 10000); // convert 0.01 = 100

  const totalScore = scoreExecution({
    timingScore,
    driftScore,
    spreadScore,
  });

  let recommendation: "ENTER" | "WAIT" | "SKIP" = "SKIP";
  let reason = "Unknown";

  if (edge < 0.02) {
    recommendation = "SKIP";
    reason = "Edge too small";
  } else if (timingScore < 30) {
    recommendation = "WAIT";
    reason = "Bad timing window";
  } else if (driftScore === 100 && totalScore > 70) {
    recommendation = "ENTER";
    reason = "Perfect conditions: value disappearing in optimal window";
  } else if (totalScore > 60) {
    recommendation = "ENTER";
    reason = "Good execution conditions";
  } else {
    recommendation = "WAIT";
    reason = "Suboptimal conditions";
  }

  return {
    recommendation,
    score: totalScore,
    reason,
  };
}
