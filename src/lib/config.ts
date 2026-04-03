/**
 * System configuration
 */

// Starting bankroll for staking calculations
export const BANKROLL = 1000

// Kelly fraction (0.25 = quarter Kelly for safety)
export const KELLY_FRACTION = 0.25

// Stake bounds (% of bankroll)
export const MIN_STAKE_PERCENT = 0.005 // 0.5% = £5
export const MAX_STAKE_PERCENT = 0.03 // 3% = £30
export const ABSOLUTE_MIN_STAKE = 5
export const ABSOLUTE_MAX_STAKE = 100
