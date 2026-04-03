/**
 * Smart staking based on fractional Kelly criterion
 * Safe, edge-aware capital allocation
 */

import {
  BANKROLL,
  KELLY_FRACTION,
  MIN_STAKE_PERCENT,
  MAX_STAKE_PERCENT,
  ABSOLUTE_MIN_STAKE,
  ABSOLUTE_MAX_STAKE,
} from './config'

/**
 * Calculate optimal stake using fractional Kelly
 *
 * Formula:
 * - Edge = (prob * odds) - 1
 * - Kelly = edge / (odds - 1)
 * - Fraction = kelly * 0.25 (conservative)
 * - Stake = bankroll * fraction
 *
 * @param prob Model probability (0-1)
 * @param odds Market odds (decimal)
 * @param bankroll Optional custom bankroll
 * @returns Stake in currency (£)
 */
export function getStake(
  prob: number,
  odds: number,
  bankroll: number = BANKROLL
): number {
  // Validate inputs
  if (prob <= 0 || prob > 1 || odds < 1.01) {
    return 0
  }

  // Calculate edge
  const edge = prob * odds - 1

  // No edge = no bet
  if (edge <= 0) {
    return 0
  }

  // Kelly fraction
  const kelly = edge / (odds - 1)

  // Apply fractional Kelly (0.25x for safety)
  const fraction = kelly * KELLY_FRACTION

  // Clamp to safe range (0% to 5%)
  const cappedFraction = Math.max(0, Math.min(fraction, 0.05))

  // Calculate base stake
  const baseStake = bankroll * cappedFraction

  // Apply absolute bounds
  const finalStake = Math.max(
    ABSOLUTE_MIN_STAKE,
    Math.min(baseStake, ABSOLUTE_MAX_STAKE)
  )

  // Round to nearest pound
  return Math.round(finalStake)
}

/**
 * Debug info for stake calculation
 */
export function getStakeDetails(
  prob: number,
  odds: number,
  bankroll: number = BANKROLL
) {
  const edge = prob * odds - 1
  const kelly = edge > 0 ? edge / (odds - 1) : 0
  const fraction = kelly * KELLY_FRACTION
  const cappedFraction = Math.max(0, Math.min(fraction, 0.05))
  const stake = getStake(prob, odds, bankroll)

  return {
    prob,
    odds,
    edge: parseFloat((edge * 100).toFixed(2)),
    kelly: parseFloat((kelly * 100).toFixed(2)),
    fraction: parseFloat((fraction * 100).toFixed(2)),
    cappedFraction: parseFloat((cappedFraction * 100).toFixed(2)),
    stake,
  }
}
