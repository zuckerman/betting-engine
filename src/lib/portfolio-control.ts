/**
 * Portfolio Control
 * 
 * Risk management: exposure limits, drawdown protection, correlation control
 */

// ============================================================================
// TYPES
// ============================================================================

export type Bet = {
  id: string
  matchId: string
  league: string
  odds: number
  stake: number
  entryTime: number
  kickoff: string
}

export type PortfolioStats = {
  totalStaked: number
  activeBets: number
  dailyExposure: number
  matchExposures: Record<string, number>
  leagueExposures: Record<string, number>
  drawdown: number
  maxDrawdown: number
}

export type RiskCheck = {
  allowed: boolean
  reason?: string
  violatedLimits: string[]
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const PORTFOLIO_CONFIG = {
  // Exposure limits (% of bankroll)
  MAX_MATCH_EXPOSURE: 0.1, // 10% per match
  MAX_DAILY_EXPOSURE: 0.2, // 20% total daily
  MAX_LEAGUE_EXPOSURE: 0.3, // 30% per league
  MAX_ACTIVE_BETS: 15, // Max concurrent bets
  
  // Drawdown protection
  MAX_DRAWDOWN: 0.25, // 25% max drawdown
  PAUSE_AT_DRAWDOWN: true, // Pause system if exceeded
  
  // Correlation control
  MAX_SAME_MATCH_BETS: 1, // No multiple bets on same match
  
  // Time decay
  MAX_DAILY_RESET_HOUR: 0 // Reset daily exposure at midnight UTC
}

// ============================================================================
// EXPOSURE CALCULATIONS
// ============================================================================

/**
 * Get total stake on a specific match
 */
export function getMatchExposure(bets: Bet[], matchId: string): number {
  return bets
    .filter(b => b.matchId === matchId)
    .reduce((sum, b) => sum + b.stake, 0)
}

/**
 * Get total daily exposure
 */
export function getDailyExposure(bets: Bet[]): number {
  return bets.reduce((sum, b) => sum + b.stake, 0)
}

/**
 * Get exposure per league
 */
export function getLeagueExposure(bets: Bet[], league: string): number {
  return bets
    .filter(b => b.league === league)
    .reduce((sum, b) => sum + b.stake, 0)
}

/**
 * Get all league exposures
 */
export function getAllLeagueExposures(bets: Bet[]): Record<string, number> {
  const exposures: Record<string, number> = {}
  
  for (const bet of bets) {
    exposures[bet.league] = (exposures[bet.league] || 0) + bet.stake
  }
  
  return exposures
}

/**
 * Get all match exposures
 */
export function getAllMatchExposures(bets: Bet[]): Record<string, number> {
  const exposures: Record<string, number> = {}
  
  for (const bet of bets) {
    exposures[bet.matchId] = (exposures[bet.matchId] || 0) + bet.stake
  }
  
  return exposures
}

// ============================================================================
// RISK CHECKS
// ============================================================================

/**
 * Check if new bet violates any portfolio limits
 */
export function canPlaceBet(
  newBet: Bet,
  existingBets: Bet[],
  bankroll: number
): RiskCheck {
  
  const violations: string[] = []

  // Check 1: Match exposure
  const matchExp = getMatchExposure(existingBets, newBet.matchId)
  if (matchExp + newBet.stake > bankroll * PORTFOLIO_CONFIG.MAX_MATCH_EXPOSURE) {
    violations.push(`Match exposure: £${matchExp + newBet.stake} > £${bankroll * PORTFOLIO_CONFIG.MAX_MATCH_EXPOSURE}`)
  }

  // Check 2: Daily exposure
  const dailyExp = getDailyExposure(existingBets)
  if (dailyExp + newBet.stake > bankroll * PORTFOLIO_CONFIG.MAX_DAILY_EXPOSURE) {
    violations.push(`Daily exposure: £${dailyExp + newBet.stake} > £${bankroll * PORTFOLIO_CONFIG.MAX_DAILY_EXPOSURE}`)
  }

  // Check 3: League exposure
  const leagueExp = getLeagueExposure(existingBets, newBet.league)
  if (leagueExp + newBet.stake > bankroll * PORTFOLIO_CONFIG.MAX_LEAGUE_EXPOSURE) {
    violations.push(`League exposure: £${leagueExp + newBet.stake} > £${bankroll * PORTFOLIO_CONFIG.MAX_LEAGUE_EXPOSURE}`)
  }

  // Check 4: Number of active bets
  if (existingBets.length >= PORTFOLIO_CONFIG.MAX_ACTIVE_BETS) {
    violations.push(`Too many active bets: ${existingBets.length} >= ${PORTFOLIO_CONFIG.MAX_ACTIVE_BETS}`)
  }

  // Check 5: Correlation (no multiple bets on same match)
  const sameMatchBets = existingBets.filter(b => b.matchId === newBet.matchId).length
  if (sameMatchBets >= PORTFOLIO_CONFIG.MAX_SAME_MATCH_BETS) {
    violations.push(`Already have ${sameMatchBets} bet(s) on this match`)
  }

  return {
    allowed: violations.length === 0,
    reason: violations.length > 0 ? violations[0] : undefined,
    violatedLimits: violations
  }
}

// ============================================================================
// DRAWDOWN PROTECTION
// ============================================================================

/**
 * Calculate current drawdown
 */
export function calculateDrawdown(
  currentBankroll: number,
  peakBankroll: number
): number {
  
  if (peakBankroll === 0) return 0
  
  const drawdown = (peakBankroll - currentBankroll) / peakBankroll
  
  return Math.max(0, drawdown) // Never negative
}

/**
 * Check if drawdown exceeds limit
 */
export function exceedsDrawdownLimit(
  currentBankroll: number,
  peakBankroll: number
): boolean {
  
  const drawdown = calculateDrawdown(currentBankroll, peakBankroll)
  
  return drawdown > PORTFOLIO_CONFIG.MAX_DRAWDOWN
}

/**
 * Get drawdown status
 */
export function getDrawdownStatus(
  currentBankroll: number,
  peakBankroll: number
): {
  drawdown: number
  percentRemaining: number
  recovering: boolean
  shouldPause: boolean
} {
  
  const drawdown = calculateDrawdown(currentBankroll, peakBankroll)
  const exceeded = drawdown > PORTFOLIO_CONFIG.MAX_DRAWDOWN
  
  return {
    drawdown,
    percentRemaining: ((peakBankroll - currentBankroll) / peakBankroll) * 100,
    recovering: currentBankroll >= peakBankroll,
    shouldPause: exceeded && PORTFOLIO_CONFIG.PAUSE_AT_DRAWDOWN
  }
}

// ============================================================================
// PORTFOLIO STATS
// ============================================================================

/**
 * Calculate complete portfolio statistics
 */
export function getPortfolioStats(
  bets: Bet[],
  bankroll: number,
  currentBankroll: number,
  peakBankroll: number
): PortfolioStats {
  
  return {
    totalStaked: getDailyExposure(bets),
    activeBets: bets.length,
    dailyExposure: (getDailyExposure(bets) / bankroll) * 100,
    matchExposures: getAllMatchExposures(bets),
    leagueExposures: getAllLeagueExposures(bets),
    drawdown: calculateDrawdown(currentBankroll, peakBankroll),
    maxDrawdown: PORTFOLIO_CONFIG.MAX_DRAWDOWN
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format portfolio stats for display
 */
export function formatPortfolioStats(stats: PortfolioStats): string {
  const maxMatchExp = Math.max(...Object.values(stats.matchExposures), 0)
  const maxLeagueExp = Math.max(...Object.values(stats.leagueExposures), 0)
  
  return `
Portfolio Status:
  Total Staked: £${stats.totalStaked.toFixed(2)}
  Active Bets: ${stats.activeBets}
  Daily Exposure: ${stats.dailyExposure.toFixed(1)}%
  Max Match Exposure: ${maxMatchExp.toFixed(2)}
  Max League Exposure: ${maxLeagueExp.toFixed(2)}
  Drawdown: ${(stats.drawdown * 100).toFixed(1)}% / ${(stats.maxDrawdown * 100).toFixed(1)}%
  `.trim()
}

/**
 * Get exposure by league for analysis
 */
export function getLeagueExposureAnalysis(
  bets: Bet[],
  bankroll: number
): Array<{ league: string; exposure: number; percent: number; limit: number }> {
  
  const exposures = getAllLeagueExposures(bets)
  const limit = bankroll * PORTFOLIO_CONFIG.MAX_LEAGUE_EXPOSURE
  
  return Object.entries(exposures)
    .map(([league, exposure]) => ({
      league,
      exposure,
      percent: (exposure / bankroll) * 100,
      limit
    }))
    .sort((a, b) => b.exposure - a.exposure)
}

/**
 * Suggest bet rejection reasons
 */
export function suggestBetImprovements(
  check: RiskCheck,
  bankroll: number
): string[] {
  
  const suggestions: string[] = []
  
  for (const violation of check.violatedLimits) {
    if (violation.includes("Match exposure")) {
      suggestions.push("Consider smaller stake or wait for this match to settle")
    } else if (violation.includes("Daily exposure")) {
      suggestions.push("Daily limit reached. Wait for bets to settle or reduce stakes")
    } else if (violation.includes("League exposure")) {
      suggestions.push("Too much exposure to this league. Diversify to other leagues")
    } else if (violation.includes("active bets")) {
      suggestions.push("Maximum bet limit reached. Wait for some to settle")
    } else if (violation.includes("same match")) {
      suggestions.push("Already have a bet on this match. Don't double-bet same outcome")
    }
  }
  
  return suggestions
}
