/**
 * Staking Engine
 * 
 * Kelly Criterion + fractional kelly + hard caps
 * Maximize growth without blowing up
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export const STAKING_CONFIG = {
  // Kelly fraction (never use full Kelly)
  KELLY_FRACTION: 0.25, // 25% Kelly = balanced
  
  // Hard limits
  MAX_BET_PERCENT: 0.05, // Never exceed 5% of bankroll
  MIN_BET_PERCENT: 0.005, // Never bet less than 0.5%
  MIN_BET_ABSOLUTE: 1, // Never less than £1
  
  // Edge scaling
  EDGE_SCALE_MULTIPLIER: 2, // Higher edge = bigger bet
  
  // Minimum requirements
  MIN_ODDS: 1.2,
  MAX_ODDS: 10.0
}

// ============================================================================
// KELLY CALCULATIONS
// ============================================================================

/**
 * Calculate Kelly fraction
 * 
 * Kelly = (bp - q) / b
 * Where:
 * - b = odds - 1
 * - p = model probability
 * - q = 1 - p
 */
export function kellyFraction(modelProb: number, odds: number): number {
  if (modelProb <= 0 || modelProb >= 1 || odds < 1.01) {
    return 0
  }

  const b = odds - 1
  const q = 1 - modelProb
  
  const kelly = ((b * modelProb) - q) / b
  
  // Kelly can be negative (avoid)
  return Math.max(0, kelly)
}

/**
 * Calculate stake using fractional Kelly
 * 
 * Fractional Kelly = full Kelly * fraction
 * Much safer than full Kelly
 */
export function calculateFractionalKelly(
  bankroll: number,
  modelProb: number,
  odds: number,
  kellyFraction: number = STAKING_CONFIG.KELLY_FRACTION
): number {
  
  const fullKelly = kellyFraction(modelProb, odds)
  const fractional = fullKelly * kellyFraction
  
  return bankroll * fractional
}

// ============================================================================
// EDGE-BASED SCALING
// ============================================================================

/**
 * Adjust stake based on edge quality
 * Higher edge = larger bet
 * But with safety bounds
 */
export function applyEdgeScaling(
  stake: number,
  rawEdge: number
): number {
  
  // Minimum edge threshold
  if (rawEdge < 0.02) return stake * 0.5 // Halve low-edge bets
  if (rawEdge < 0.03) return stake * 0.75
  if (rawEdge > 0.10) return stake * 1.5 // Boost high-edge bets
  if (rawEdge > 0.15) return stake * 2.0
  
  return stake
}

// ============================================================================
// HARD LIMITS
// ============================================================================

/**
 * Apply hard betting limits
 */
export function applyBetLimits(
  stake: number,
  bankroll: number
): number {
  
  const maxBet = bankroll * STAKING_CONFIG.MAX_BET_PERCENT
  const minBet = Math.max(
    bankroll * STAKING_CONFIG.MIN_BET_PERCENT,
    STAKING_CONFIG.MIN_BET_ABSOLUTE
  )
  
  return Math.max(minBet, Math.min(stake, maxBet))
}

// ============================================================================
// FINAL STAKE CALCULATION
// ============================================================================

export type StakeCalculation = {
  bankroll: number
  kelly: number
  fractional: number
  scaled: number
  final: number
  percentOfBankroll: number
  rationale: string
}

/**
 * Full stake calculation pipeline
 */
export function calculateStake(
  bankroll: number,
  modelProb: number,
  odds: number,
  rawEdge: number,
  kellyFraction: number = STAKING_CONFIG.KELLY_FRACTION
): StakeCalculation {
  
  // Step 1: Calculate full Kelly
  const kelly = kellyFraction(modelProb, odds)
  
  // Step 2: Apply fractional Kelly (safety)
  const fractional = kelly * kellyFraction
  const fractionalStake = bankroll * fractional
  
  // Step 3: Edge-based scaling
  const scaledStake = applyEdgeScaling(fractionalStake, rawEdge)
  
  // Step 4: Hard limits
  const finalStake = applyBetLimits(scaledStake, bankroll)
  
  const percentOfBankroll = (finalStake / bankroll) * 100
  
  // Build rationale
  let rationale = `Kelly: ${(kelly * 100).toFixed(2)}% → ${(fractional * 100).toFixed(2)}% (fractional) → £${fractionalStake.toFixed(2)}`
  
  if (scaledStake !== fractionalStake) {
    rationale += ` → £${scaledStake.toFixed(2)} (edge scaling)`
  }
  
  if (finalStake !== scaledStake) {
    rationale += ` → £${finalStake.toFixed(2)} (limits applied)`
  }
  
  return {
    bankroll,
    kelly,
    fractional,
    scaled: scaledStake,
    final: finalStake,
    percentOfBankroll,
    rationale
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format stake for display
 */
export function formatStake(stake: StakeCalculation): string {
  return `
Stake: £${stake.final.toFixed(2)} (${stake.percentOfBankroll.toFixed(2)}% of bankroll)
Kelly: ${(stake.kelly * 100).toFixed(2)}% → ${(stake.fractional * 100).toFixed(2)}%
${stake.rationale}
  `.trim()
}

/**
 * Get Kelly recommendation
 */
export function getKellyRecommendation(modelProb: number, odds: number): string {
  const kelly = kellyFraction(modelProb, odds)
  
  if (kelly > 0.1) return "Strong signal, consider 25% Kelly"
  if (kelly > 0.05) return "Moderate signal, use 25% Kelly"
  if (kelly > 0.02) return "Weak signal, use 10-15% Kelly"
  
  return "No edge detected"
}

/**
 * Calculate optimal Kelly fraction for risk tolerance
 */
export function recommendedKellyFraction(riskTolerance: "conservative" | "balanced" | "aggressive"): number {
  switch (riskTolerance) {
    case "conservative":
      return 0.1 // 10% Kelly
    case "balanced":
      return 0.25 // 25% Kelly
    case "aggressive":
      return 0.5 // 50% Kelly
    default:
      return 0.25
  }
}

/**
 * Calculate bet size for different bankroll amounts
 */
export function scaledStakeForBankroll(
  modelProb: number,
  odds: number,
  bankroll: number
): number {
  const fraction = calculateFractionalKelly(bankroll, modelProb, odds)
  return applyBetLimits(fraction, bankroll)
}
