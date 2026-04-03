/**
 * Bet Filters
 * 
 * Pre-flight checks: Remove bad bets before they enter the system
 * Filters work as a pipeline: must pass ALL to be accepted
 */

export type FilterResult = {
  passed: boolean
  reason?: string
  severity?: "info" | "warning" | "critical"
}

export type FilterStats = {
  total: number
  passed: number
  rejected: {
    liquidity: number
    spread: number
    oddsRange: number
    marketStatus: number
    timeWindow: number
    runner: number
    other: number
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const FILTER_CONFIG = {
  // Liquidity: minimum matched amount (in £)
  MIN_LIQUIDITY: 10000,
  
  // Spread: maximum allowed spread %
  MAX_SPREAD: 0.03, // 3%
  
  // Odds: valid range
  MIN_ODDS: 1.2,
  MAX_ODDS: 10.0,
  
  // Time: hours before kickoff
  MIN_HOURS_BEFORE_KICKOFF: 1,
  MAX_HOURS_BEFORE_KICKOFF: 24
}

// ============================================================================
// INDIVIDUAL FILTERS
// ============================================================================

/**
 * Liquidity Filter
 * Low liquidity = fake prices = useless CLV
 */
export function passesLiquidity(totalMatched: number): FilterResult {
  if (totalMatched >= FILTER_CONFIG.MIN_LIQUIDITY) {
    return { passed: true }
  }
  
  return {
    passed: false,
    reason: `Liquidity too low: £${totalMatched} < £${FILTER_CONFIG.MIN_LIQUIDITY}`,
    severity: "critical"
  }
}

/**
 * Spread Filter
 * Wide spread = bad pricing = false edge
 */
export function passesSpread(backPrice: number | null, layPrice: number | null): FilterResult {
  if (!backPrice || !layPrice) {
    return {
      passed: false,
      reason: "Missing back or lay price",
      severity: "critical"
    }
  }

  const spread = (layPrice - backPrice) / backPrice

  if (spread <= FILTER_CONFIG.MAX_SPREAD) {
    return { passed: true }
  }

  return {
    passed: false,
    reason: `Spread too wide: ${(spread * 100).toFixed(2)}% > ${(FILTER_CONFIG.MAX_SPREAD * 100).toFixed(2)}%`,
    severity: "warning"
  }
}

/**
 * Odds Range Filter
 * Avoid extremes (too likely or too unlikely)
 */
export function passesOddsRange(odds: number): FilterResult {
  if (odds >= FILTER_CONFIG.MIN_ODDS && odds <= FILTER_CONFIG.MAX_ODDS) {
    return { passed: true }
  }

  const reason = odds < FILTER_CONFIG.MIN_ODDS
    ? `Odds too short: ${odds} < ${FILTER_CONFIG.MIN_ODDS}`
    : `Odds too long: ${odds} > ${FILTER_CONFIG.MAX_ODDS}`

  return {
    passed: false,
    reason,
    severity: odds < FILTER_CONFIG.MIN_ODDS ? "info" : "warning"
  }
}

/**
 * Market Status Filter
 * Only open, active markets
 */
export function passesMarketStatus(status: string): FilterResult {
  if (status === "OPEN") {
    return { passed: true }
  }

  return {
    passed: false,
    reason: `Market not open: status = ${status}`,
    severity: "critical"
  }
}

/**
 * Runner Status Filter
 * Only active runners
 */
export function passesRunnerStatus(runnerStatus: string): FilterResult {
  if (runnerStatus === "ACTIVE") {
    return { passed: true }
  }

  return {
    passed: false,
    reason: `Runner not active: status = ${runnerStatus}`,
    severity: "critical"
  }
}

/**
 * Time Window Filter (VERY IMPORTANT)
 * Avoid stale or too-early markets
 * Sweet spot: 1-24 hours before kickoff
 */
export function passesTimeWindow(kickoff: string): FilterResult {
  const now = Date.now()
  const kickoffTime = new Date(kickoff).getTime()
  
  const hoursBefore = (kickoffTime - now) / (1000 * 60 * 60)

  if (
    hoursBefore >= FILTER_CONFIG.MIN_HOURS_BEFORE_KICKOFF &&
    hoursBefore <= FILTER_CONFIG.MAX_HOURS_BEFORE_KICKOFF
  ) {
    return { passed: true }
  }

  const reason = hoursBefore < FILTER_CONFIG.MIN_HOURS_BEFORE_KICKOFF
    ? `Too late: ${hoursBefore.toFixed(1)}h before kickoff`
    : `Too early: ${hoursBefore.toFixed(1)}h before kickoff`

  return {
    passed: false,
    reason,
    severity: hoursBefore < 0 ? "critical" : "warning"
  }
}

// ============================================================================
// MASTER FILTER PIPELINE
// ============================================================================

export type BetFilterInput = {
  kickoff: string
  totalMatched: number
  marketStatus: string
  backPrice: number | null
  layPrice: number | null
  odds: number
  runnerStatus: string
}

/**
 * Run all filters
 * Returns immediately on first failure
 */
export function passesAllFilters(input: BetFilterInput): FilterResult {
  // Check time window first (cheap, fast)
  const timeResult = passesTimeWindow(input.kickoff)
  if (!timeResult.passed) return timeResult

  // Check market status (critical)
  const statusResult = passesMarketStatus(input.marketStatus)
  if (!statusResult.passed) return statusResult

  // Check runner status (critical)
  const runnerResult = passesRunnerStatus(input.runnerStatus)
  if (!runnerResult.passed) return runnerResult

  // Check odds range
  const oddsResult = passesOddsRange(input.odds)
  if (!oddsResult.passed) return oddsResult

  // Check spread (before liquidity - early rejection)
  const spreadResult = passesSpread(input.backPrice, input.layPrice)
  if (!spreadResult.passed) return spreadResult

  // Check liquidity (most important, but expensive)
  const liquidityResult = passesLiquidity(input.totalMatched)
  if (!liquidityResult.passed) return liquidityResult

  // All filters passed
  return { passed: true }
}

// ============================================================================
// BATCH FILTERING
// ============================================================================

export function filterBets(
  bets: (BetFilterInput & { id: string })[],
  trackStats: boolean = false
): {
  passed: (BetFilterInput & { id: string })[]
  rejected: { bet: BetFilterInput & { id: string }; reason: string }[]
  stats?: FilterStats
} {
  const passed: (BetFilterInput & { id: string })[] = []
  const rejected: { bet: BetFilterInput & { id: string }; reason: string }[] = []

  const stats: FilterStats = {
    total: bets.length,
    passed: 0,
    rejected: {
      liquidity: 0,
      spread: 0,
      oddsRange: 0,
      marketStatus: 0,
      timeWindow: 0,
      runner: 0,
      other: 0
    }
  }

  for (const bet of bets) {
    const result = passesAllFilters(bet)

    if (result.passed) {
      passed.push(bet)
      if (trackStats) stats.passed++
    } else {
      rejected.push({ bet, reason: result.reason || "Unknown" })
      
      if (trackStats) {
        // Categorize rejection
        if (result.reason?.includes("Liquidity")) stats.rejected.liquidity++
        else if (result.reason?.includes("Spread")) stats.rejected.spread++
        else if (result.reason?.includes("Odds")) stats.rejected.oddsRange++
        else if (result.reason?.includes("status")) stats.rejected.marketStatus++
        else if (result.reason?.includes("before kickoff") || result.reason?.includes("Too late")) stats.rejected.timeWindow++
        else if (result.reason?.includes("Runner")) stats.rejected.runner++
        else stats.rejected.other++
      }
    }
  }

  return {
    passed,
    rejected,
    stats: trackStats ? stats : undefined
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format filter stats for display
 */
export function formatFilterStats(stats: FilterStats): string {
  const rejectionRate = ((stats.total - stats.passed) / stats.total * 100).toFixed(1)
  
  return `
Filters: ${stats.passed}/${stats.total} passed (${rejectionRate}% rejected)
  - Liquidity: ${stats.rejected.liquidity}
  - Spread: ${stats.rejected.spread}
  - Odds Range: ${stats.rejected.oddsRange}
  - Market Status: ${stats.rejected.marketStatus}
  - Time Window: ${stats.rejected.timeWindow}
  - Runner: ${stats.rejected.runner}
  - Other: ${stats.rejected.other}
  `.trim()
}
