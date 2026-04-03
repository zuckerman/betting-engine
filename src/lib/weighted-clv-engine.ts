/**
 * Weighted CLV Engine
 * 
 * Multi-book consensus pricing with signal quality metrics
 * Uses The Odds API to get closing prices from multiple bookmakers
 * Weights sharp books (Pinnacle) higher than soft books
 */

export type BookmakerOdds = {
  book: string
  price: number
  timestamp?: string
}

export type CLVResult = {
  clv: number
  consensus: number
  spread: number
  strength: "STRONG" | "MEDIUM" | "WEAK" | "NEGATIVE"
  valid: boolean
  booksCount: number
  details: {
    entry: number
    min: number
    max: number
    spreadPct: number
    weights: Record<string, number>
  }
}

// ============================================================================
// BOOKMAKER WEIGHTS
// ============================================================================

/**
 * Bookmaker reliability weights
 * Sharp books (closer to true odds) weighted higher
 * Soft books weighted lower
 */
export const BOOKMAKER_WEIGHTS: Record<string, number> = {
  // Tier 1: Sharp books (true market price)
  pinnacle: 1.0,
  "pinnacle_exchange": 1.0,

  // Tier 2: Semi-sharp (reliable)
  bet365: 0.85,
  betfair: 0.85,
  betway: 0.85,
  skybet: 0.85,

  // Tier 3: Soft books (slower to adjust)
  williamhill: 0.75,
  ladbrokes: 0.75,
  coral: 0.75,
  "888sport": 0.75,

  // Tier 4: Very soft (marketing-driven)
  unibet: 0.65,
  "leovegas": 0.65,

  // Default for unknown
  default: 0.7,
}

// ============================================================================
// CALCULATE WEIGHTED CONSENSUS PRICE
// ============================================================================

/**
 * Calculate weighted average of bookmaker odds
 * Weights sharp books (Pinnacle) higher
 */
export function calculateWeightedPrice(odds: BookmakerOdds[]): number {
  if (!odds || odds.length === 0) return 0

  let totalWeight = 0
  let weightedSum = 0

  for (const o of odds) {
    const weight = BOOKMAKER_WEIGHTS[o.book] || BOOKMAKER_WEIGHTS.default

    weightedSum += o.price * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

// ============================================================================
// MARKET AGREEMENT CHECK
// ============================================================================

/**
 * Calculate price spread across bookmakers
 * High spread = market disagreement = unreliable signal
 */
export function calculatePriceSpread(odds: BookmakerOdds[]): number {
  if (!odds || odds.length === 0) return 0

  const prices = odds.map((o) => o.price)
  const max = Math.max(...prices)
  const min = Math.min(...prices)

  if (min === 0) return 0

  return (max - min) / min
}

// ============================================================================
// CLV STRENGTH ASSESSMENT
// ============================================================================

/**
 * Classify CLV signal strength
 */
export function assessCLVStrength(
  clv: number
): "STRONG" | "MEDIUM" | "WEAK" | "NEGATIVE" {
  if (clv < 0) return "NEGATIVE"
  if (clv > 0.05) return "STRONG"
  if (clv > 0.02) return "MEDIUM"
  if (clv > 0) return "WEAK"
  return "NEGATIVE"
}

// ============================================================================
// MAIN CLV CALCULATION
// ============================================================================

/**
 * Calculate CLV against weighted consensus price
 *
 * Returns full signal quality metrics
 */
export function calculateWeightedCLV({
  entryOdds,
  closingOdds,
}: {
  entryOdds: number
  closingOdds: BookmakerOdds[]
}): CLVResult | null {
  // Validation
  if (!entryOdds || !closingOdds || closingOdds.length === 0) {
    return null
  }

  if (entryOdds < 1.01 || entryOdds > 1000) {
    return null
  }

  // Calculate metrics
  const prices = closingOdds.map((o) => o.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const consensusPrice = calculateWeightedPrice(closingOdds)
  const spreadPct = calculatePriceSpread(closingOdds)

  // Calculate CLV
  const clv = consensusPrice > 0 ? entryOdds / consensusPrice - 1 : 0

  // Assess strength
  const strength = assessCLVStrength(clv)

  // Validate (market agreement)
  // Spread > 8% = too much disagreement = unreliable
  const isValid = spreadPct < 0.08

  return {
    clv: parseFloat(clv.toFixed(4)),
    consensus: parseFloat(consensusPrice.toFixed(2)),
    spread: parseFloat(spreadPct.toFixed(4)),
    strength,
    valid: isValid,
    booksCount: closingOdds.length,
    details: {
      entry: entryOdds,
      min: minPrice,
      max: maxPrice,
      spreadPct: parseFloat((spreadPct * 100).toFixed(2)),
      weights: Object.fromEntries(
        closingOdds.map((o) => [o.book, BOOKMAKER_WEIGHTS[o.book] || BOOKMAKER_WEIGHTS.default])
      ),
    },
  }
}

// ============================================================================
// SIGNAL FILTERING
// ============================================================================

/**
 * Filter CLV results for quality signals only
 */
export function filterQualitySignals(
  results: (CLVResult | null)[],
  options: {
    minBooksCount?: number
    minStrength?: "WEAK" | "MEDIUM" | "STRONG"
    requireValid?: boolean
  } = {}
): CLVResult[] {
  const {
    minBooksCount = 2,
    minStrength = "WEAK",
    requireValid = true,
  } = options

  const strengthOrder = { NEGATIVE: 0, WEAK: 1, MEDIUM: 2, STRONG: 3 }

  return results.filter((result) => {
    if (!result) return false
    if (result.booksCount < minBooksCount) return false
    if (strengthOrder[result.strength] < strengthOrder[minStrength]) return false
    if (requireValid && !result.valid) return false
    return true
  })
}

// ============================================================================
// BATCH ANALYSIS
// ============================================================================

/**
 * Analyze batch of CLV results
 */
export function analyzeCLVBatch(results: CLVResult[]) {
  if (!results.length) {
    return {
      count: 0,
      avgCLV: 0,
      positiveCount: 0,
      positiveRate: 0,
      strongCount: 0,
      avgSpread: 0,
      validCount: 0,
    }
  }

  const clvValues = results.map((r) => r.clv)
  const positiveCount = clvValues.filter((c) => c > 0).length
  const strongCount = results.filter((r) => r.strength === "STRONG").length
  const validCount = results.filter((r) => r.valid).length
  const avgSpread = results.reduce((sum, r) => sum + r.spread, 0) / results.length

  return {
    count: results.length,
    avgCLV: clvValues.reduce((a, b) => a + b, 0) / results.length,
    positiveCount,
    positiveRate: positiveCount / results.length,
    strongCount,
    strongRate: strongCount / results.length,
    avgSpread,
    validCount,
    validRate: validCount / results.length,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const WEIGHTED_CLV = {
  calculateWeightedPrice,
  calculatePriceSpread,
  assessCLVStrength,
  calculateWeightedCLV,
  filterQualitySignals,
  analyzeCLVBatch,
  BOOKMAKER_WEIGHTS,
}
