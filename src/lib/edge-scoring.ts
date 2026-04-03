/**
 * Edge Scoring Engine
 * 
 * Rank bets by quality, not just acceptance
 * Combine model edge + market conditions + risk factors
 */

// ============================================================================
// TYPES
// ============================================================================

export type EdgeScore = {
  rawEdge: number
  marketEdge: number
  liquidityScore: number
  spreadScore: number
  compositeScore: number
  tier: "A+" | "A" | "B" | "C" | "rejected"
  rationale: string
}

export type ScoredBet = {
  id: string
  match: string
  odds: number
  modelProb: number
  edge: EdgeScore
  rank?: number
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const EDGE_CONFIG = {
  // Minimum acceptable edge
  MIN_EDGE: 0.02, // 2%
  
  // Liquidity benchmarks
  LIQUIDITY_TARGET: 50000, // £50k
  
  // Spread thresholds
  MAX_GOOD_SPREAD: 0.01, // 1%
  MAX_ACCEPTABLE_SPREAD: 0.03, // 3%
  
  // Scoring weights
  EDGE_WEIGHT: 0.6,
  LIQUIDITY_WEIGHT: 0.25,
  SPREAD_WEIGHT: 0.15,
  
  // Tier thresholds
  TIER_A_PLUS: 0.08,
  TIER_A: 0.05,
  TIER_B: 0.03
}

// ============================================================================
// CORE CALCULATIONS
// ============================================================================

/**
 * Calculate implied probability from odds
 * odds 2.0 → 50%
 */
export function impliedProbability(odds: number): number {
  if (odds < 1.01) return 1
  return 1 / odds
}

/**
 * Calculate raw edge (your edge vs market)
 * modelProb - impliedProb
 */
export function calculateRawEdge(modelProb: number, odds: number): number {
  const marketProb = impliedProbability(odds)
  return modelProb - marketProb
}

/**
 * Calculate market edge score (0-1)
 * Based on implied probability
 * Markets around 50% = most efficient
 */
export function calculateMarketEdgeScore(odds: number): number {
  const impliedProb = impliedProbability(odds)
  
  // Peak at 50%, decay towards extremes
  const distanceFromOptimal = Math.abs(impliedProb - 0.5)
  
  return 1 - distanceFromOptimal
}

/**
 * Liquidity score (0-1)
 * Caps at target, linear below
 */
export function calculateLiquidityScore(totalMatched: number): number {
  const score = Math.min(totalMatched / EDGE_CONFIG.LIQUIDITY_TARGET, 1)
  return score
}

/**
 * Spread score (0-1)
 * Tight spread = high score
 */
export function calculateSpreadScore(backPrice: number, layPrice: number): number {
  const spread = (layPrice - backPrice) / backPrice
  
  if (spread <= EDGE_CONFIG.MAX_GOOD_SPREAD) {
    return 1.0
  }
  
  if (spread <= EDGE_CONFIG.MAX_ACCEPTABLE_SPREAD) {
    return 1 - ((spread - EDGE_CONFIG.MAX_GOOD_SPREAD) / 
                (EDGE_CONFIG.MAX_ACCEPTABLE_SPREAD - EDGE_CONFIG.MAX_GOOD_SPREAD)) * 0.3
  }
  
  return 0.7
}

// ============================================================================
// COMPOSITE SCORING
// ============================================================================

export function calculateEdgeScore(
  modelProb: number,
  odds: number,
  totalMatched: number,
  backPrice: number | null,
  layPrice: number | null
): EdgeScore {
  
  // Raw edge (primary signal)
  const rawEdge = calculateRawEdge(modelProb, odds)
  
  // Reject if below minimum edge
  if (rawEdge < EDGE_CONFIG.MIN_EDGE) {
    return {
      rawEdge,
      marketEdge: 0,
      liquidityScore: 0,
      spreadScore: 0,
      compositeScore: 0,
      tier: "rejected",
      rationale: `Insufficient edge: ${(rawEdge * 100).toFixed(2)}% < ${(EDGE_CONFIG.MIN_EDGE * 100).toFixed(2)}%`
    }
  }

  // Market edge (efficiency indicator)
  const marketEdge = calculateMarketEdgeScore(odds)
  
  // Liquidity (trust indicator)
  const liquidityScore = calculateLiquidityScore(totalMatched)
  
  // Spread (pricing quality)
  const spreadScore = (backPrice && layPrice) 
    ? calculateSpreadScore(backPrice, layPrice)
    : 0.5 // Default if missing
  
  // Composite score: weighted combination
  const compositeScore =
    (rawEdge * EDGE_CONFIG.EDGE_WEIGHT) +
    (liquidityScore * EDGE_CONFIG.LIQUIDITY_WEIGHT) +
    (spreadScore * EDGE_CONFIG.SPREAD_WEIGHT)
  
  // Determine tier
  let tier: EdgeScore["tier"]
  if (compositeScore >= EDGE_CONFIG.TIER_A_PLUS) {
    tier = "A+"
  } else if (compositeScore >= EDGE_CONFIG.TIER_A) {
    tier = "A"
  } else if (compositeScore >= EDGE_CONFIG.TIER_B) {
    tier = "B"
  } else {
    tier = "C"
  }
  
  // Build rationale
  const rationale = `
Edge: ${(rawEdge * 100).toFixed(2)}% | 
Market: ${(marketEdge * 100).toFixed(1)}% | 
Liquidity: £${totalMatched.toLocaleString()} | 
Spread: ${((backPrice && layPrice ? (layPrice - backPrice) / backPrice : 0) * 100).toFixed(2)}%
  `.trim().replace(/\s+/g, " ")
  
  return {
    rawEdge,
    marketEdge,
    liquidityScore,
    spreadScore,
    compositeScore,
    tier,
    rationale
  }
}

// ============================================================================
// RANKING
// ============================================================================

/**
 * Score and rank multiple bets
 */
export function scoreBets(
  bets: Array<{
    id: string
    match: string
    odds: number
    modelProb: number
    totalMatched: number
    backPrice: number | null
    layPrice: number | null
  }>
): ScoredBet[] {
  
  return bets
    .map(bet => ({
      id: bet.id,
      match: bet.match,
      odds: bet.odds,
      modelProb: bet.modelProb,
      edge: calculateEdgeScore(
        bet.modelProb,
        bet.odds,
        bet.totalMatched,
        bet.backPrice,
        bet.layPrice
      )
    }))
    .filter(b => b.edge.tier !== "rejected")
    .sort((a, b) => b.edge.compositeScore - a.edge.compositeScore)
    .map((bet, index) => ({ ...bet, rank: index + 1 }))
}

/**
 * Select top N bets
 */
export function selectTopBets(bets: ScoredBet[], topN: number = 10): ScoredBet[] {
  return bets.slice(0, topN)
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format edge score for display
 */
export function formatEdgeScore(score: EdgeScore): string {
  return `
[${score.tier}] Score: ${(score.compositeScore * 100).toFixed(1)}%
Raw Edge: ${(score.rawEdge * 100).toFixed(2)}%
Market Efficiency: ${(score.marketEdge * 100).toFixed(1)}%
Liquidity: ${(score.liquidityScore * 100).toFixed(0)}%
Spread Quality: ${(score.spreadScore * 100).toFixed(0)}%
  `.trim().replace(/\n\s+/g, "\n")
}

/**
 * Group bets by tier
 */
export function groupByTier(bets: ScoredBet[]): Record<string, ScoredBet[]> {
  const groups: Record<string, ScoredBet[]> = {
    "A+": [],
    "A": [],
    "B": [],
    "C": []
  }
  
  for (const bet of bets) {
    groups[bet.edge.tier].push(bet)
  }
  
  return groups
}

/**
 * Calculate average edge of a bet set
 */
export function averageEdge(bets: ScoredBet[]): number {
  if (bets.length === 0) return 0
  return bets.reduce((sum, b) => sum + b.edge.rawEdge, 0) / bets.length
}
