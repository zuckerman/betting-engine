/**
 * Kelly Criterion Calculator
 * 
 * Determines optimal bet sizing based on CLV and historical win rate
 * Implements full Kelly, half Kelly, quarter Kelly options
 * 
 * Formula: f* = (p*b - q) / b
 * Where: p = win probability, q = loss probability, b = odds decimal - 1
 * 
 * Key principle: Overbetting leads to ruin, underbetting leaves money on table
 */

export interface KellyInput {
  closingOdds: number; // Decimal odds (e.g. 2.5)
  impliedProbability: number; // Our model's predicted probability (0-1)
  historicalWinRate?: number; // Optional: observed win rate for adjustment
  bankroll: number; // Total bankroll
  kellyFraction?: number; // 1 = full Kelly, 0.5 = half Kelly, 0.25 = quarter Kelly
  minBet?: number; // Minimum bet size (£)
  maxBet?: number; // Maximum bet size (£)
}

export interface KellyResult {
  kellyFraction: number; // Calculated Kelly %
  recommendedStake: number; // Bet size in £
  expectedValue: number; // Expected value in £
  riskOfRuin: number; // Probability of losing all bankroll
  clv: number; // Closing line value
  edgePercentage: number; // Betting edge %
}

/**
 * Calculate closing line value (CLV)
 * Measures how well our odds compare to closing odds
 * CLV > 0 means we bet better than market
 */
export function calculateCLV(
  bookmakerOdds: number,
  closingOdds: number
): number {
  if (closingOdds <= 0 || bookmakerOdds <= 0) return 0;
  
  const bookmakerProb = 1 / bookmakerOdds;
  const closingProb = 1 / closingOdds;
  
  return (closingProb - bookmakerProb) * (closingOdds - 1);
}

/**
 * Calculate implied probability from decimal odds
 */
export function impliedProb(odds: number): number {
  if (odds <= 0) return 0;
  return 1 / odds;
}

/**
 * Calculate expected value for a bet
 * EV = (Probability of Win × Amount Won) - (Probability of Loss × Bet Amount)
 */
export function calculateEV(
  odds: number,
  predictedProb: number
): number {
  const marketProb = impliedProb(odds);
  const lossProb = 1 - predictedProb;
  
  return predictedProb * (odds - 1) - lossProb;
}

/**
 * Main Kelly Criterion calculator
 * Returns optimal bet sizing based on edge and bankroll
 */
export function calculateKelly(input: KellyInput): KellyResult {
  const {
    closingOdds,
    impliedProbability: ourProb,
    historicalWinRate = ourProb,
    bankroll,
    kellyFraction = 1,
    minBet = 1,
    maxBet = bankroll * 0.25, // Default: max 25% of bankroll
  } = input;

  // Calculate market probability
  const marketProb = impliedProb(closingOdds);
  
  // Edge: our probability vs market
  const edge = ourProb - marketProb;
  
  // If no edge or negative edge, bet nothing
  if (edge <= 0) {
    return {
      kellyFraction: 0,
      recommendedStake: 0,
      expectedValue: 0,
      riskOfRuin: 0,
      clv: 0,
      edgePercentage: edge * 100,
    };
  }

  // Kelly formula: f* = (p*b - q) / b
  // Where b = decimal odds - 1 (net odds)
  const netOdds = closingOdds - 1;
  const lossProb = 1 - historicalWinRate;
  
  const fullKelly = (historicalWinRate * netOdds - lossProb) / netOdds;
  
  // Apply Kelly fraction (safety factor)
  const adjustedKelly = Math.max(0, Math.min(1, fullKelly * kellyFraction));

  // Calculate recommended stake
  let recommendedStake = bankroll * adjustedKelly;
  
  // Apply min/max bounds
  recommendedStake = Math.max(minBet, Math.min(maxBet, recommendedStake));

  // Calculate expected value
  const ev = recommendedStake * edge;

  // Simplified risk of ruin calculation
  // For frequent betting, RoR ≈ (1 - kelly_fraction)^(n_bets)
  // Using 100 bets as reference point
  const riskOfRuin = Math.pow(1 - adjustedKelly, 100);

  // Calculate CLV for this specific bet
  const clv = calculateCLV(closingOdds * 0.98, closingOdds); // Assume 2% vig

  return {
    kellyFraction: adjustedKelly * 100,
    recommendedStake: Math.round(recommendedStake * 100) / 100,
    expectedValue: Math.round(ev * 100) / 100,
    riskOfRuin: Math.round(riskOfRuin * 10000) / 100,
    clv: Math.round(clv * 1000) / 1000,
    edgePercentage: Math.round(edge * 10000) / 100,
  };
}

/**
 * Batch Kelly calculation for multiple markets
 * Helps allocate bankroll across correlated bets
 */
export function calculateKellyPortfolio(
  predictions: Array<{
    odds: number;
    probability: number;
    correlation?: number;
  }>,
  bankroll: number,
  kellyFraction: number = 0.5
): Array<KellyResult> {
  // Simple approach: proportionally scale Kelly across all selections
  // (Full portfolio optimization would use covariance matrices)
  
  return predictions.map((pred) =>
    calculateKelly({
      closingOdds: pred.odds,
      impliedProbability: pred.probability,
      bankroll,
      kellyFraction,
    })
  );
}

/**
 * Calculate required CLV for breakeven
 * Shows minimum CLV needed to justify a bet
 */
export function requiredCLVForBreakeven(
  odds: number,
  kellyFraction: number = 1
): number {
  // At Kelly fraction of 100%, we need CLV that exceeds the vigorish
  // Typical vig = 2-4%, so CLV > 0.03 is usually required
  
  const vig = 0.03; // Assume 3% vig
  return vig / kellyFraction;
}

/**
 * Simulate bet outcomes with Kelly sizing
 * Useful for backtesting portfolio
 */
export function simulateKellyOutcomes(
  predictions: Array<{
    odds: number;
    probability: number;
    actualResult: 1 | 0; // 1 = win, 0 = loss
  }>,
  initialBankroll: number,
  kellyFraction: number = 0.5
): {
  finalBankroll: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
} {
  let bankroll = initialBankroll;
  let peakBankroll = initialBankroll;
  let maxDrawdown = 0;
  let totalPnL: number[] = [];

  predictions.forEach((pred) => {
    const kelly = calculateKelly({
      closingOdds: pred.odds,
      impliedProbability: pred.probability,
      bankroll,
      kellyFraction,
    });

    const stake = kelly.recommendedStake;
    const pnl = pred.actualResult === 1
      ? stake * (pred.odds - 1)
      : -stake;

    bankroll += pnl;
    totalPnL.push(pnl);

    // Track drawdown
    if (bankroll > peakBankroll) {
      peakBankroll = bankroll;
    } else {
      const drawdown = (peakBankroll - bankroll) / peakBankroll;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  });

  // Calculate win rate
  const wins = predictions.filter((p) => p.actualResult === 1).length;
  const winRate = wins / predictions.length;

  // Calculate Sharpe ratio (simplified: std dev of returns / mean return)
  const meanPnL = totalPnL.reduce((a, b) => a + b, 0) / totalPnL.length;
  const variance = totalPnL.reduce(
    (sum, pnl) => sum + Math.pow(pnl - meanPnL, 2),
    0
  ) / totalPnL.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? meanPnL / stdDev : 0;

  return {
    finalBankroll: Math.round(bankroll * 100) / 100,
    totalReturn: Math.round(((bankroll - initialBankroll) / initialBankroll) * 10000) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    winRate: Math.round(winRate * 10000) / 100,
  };
}
