/**
 * Risk-of-ruin protection
 * 
 * Prevents:
 * - Over-leveraging
 * - Correlated wipeouts
 * - Death spirals
 */

export interface RiskLimits {
  maxTotalExposure: number // 0.15 = 15% of bankroll
  maxSingleBet: number // 0.03 = 3% of bankroll
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxTotalExposure: 0.15, // 15%
  maxSingleBet: 0.03, // 3%
}

/**
 * Calculate current open exposure from unsettled bets
 */
export function getOpenExposure(openBets: Array<{ stake: number }>): number {
  return openBets.reduce((sum, bet) => sum + bet.stake, 0)
}

/**
 * Check if new bet would exceed risk limits
 */
export function canPlaceBet({
  bankroll,
  proposedStake,
  openExposure,
  limits = DEFAULT_RISK_LIMITS,
}: {
  bankroll: number
  proposedStake: number
  openExposure: number
  limits?: RiskLimits
}): {
  allowed: boolean
  reason?: string
  maxAllowedStake?: number
} {
  // Check max single bet
  const maxSingle = bankroll * limits.maxSingleBet
  if (proposedStake > maxSingle) {
    return {
      allowed: false,
      reason: `Stake ${proposedStake} exceeds max single bet (${Math.round(maxSingle)})`,
      maxAllowedStake: maxSingle,
    }
  }

  // Check total exposure
  const maxTotal = bankroll * limits.maxTotalExposure
  const newTotal = openExposure + proposedStake

  if (newTotal > maxTotal) {
    return {
      allowed: false,
      reason: `Total exposure ${newTotal} would exceed limit (${Math.round(maxTotal)})`,
      maxAllowedStake: maxTotal - openExposure,
    }
  }

  return { allowed: true }
}

/**
 * Get debug info about current risk state
 */
export function getRiskDebug({
  bankroll,
  openExposure,
  openBetsCount,
  limits = DEFAULT_RISK_LIMITS,
}: {
  bankroll: number
  openExposure: number
  openBetsCount: number
  limits?: RiskLimits
}) {
  const maxTotal = bankroll * limits.maxTotalExposure
  const exposurePercent = (openExposure / bankroll) * 100

  return {
    bankroll: Math.round(bankroll * 100) / 100,
    openExposure: Math.round(openExposure * 100) / 100,
    openBetsCount,
    exposurePercent: Math.round(exposurePercent * 10) / 10 + '%',
    maxAllowed: Math.round(maxTotal * 100) / 100,
    remainingCapacity: Math.round((maxTotal - openExposure) * 100) / 100,
  }
}
