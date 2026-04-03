/**
 * Stake smoothing - reduces volatility and overreaction
 * 
 * Uses rolling average (5-bet window) to smooth Kelly spikes
 */

export interface StakeSmoother {
  recentStakes: number[]
  maxWindow: number
}

/**
 * Create a new smoother instance
 */
export function createSmoother(maxWindow: number = 5): StakeSmoother {
  return {
    recentStakes: [],
    maxWindow,
  }
}

/**
 * Add stake and return smoothed value
 */
export function smoothStake(smoother: StakeSmoother, newStake: number): number {
  // Add to history
  smoother.recentStakes.push(newStake)

  // Keep only last N stakes
  if (smoother.recentStakes.length > smoother.maxWindow) {
    smoother.recentStakes.shift()
  }

  // Calculate average
  const average =
    smoother.recentStakes.reduce((a, b) => a + b, 0) /
    smoother.recentStakes.length

  // Round to nearest pound
  return Math.round(average)
}

/**
 * Get debug info
 */
export function getSmootherDebug(smoother: StakeSmoother) {
  const average =
    smoother.recentStakes.length > 0
      ? smoother.recentStakes.reduce((a, b) => a + b, 0) /
        smoother.recentStakes.length
      : 0

  return {
    recent: smoother.recentStakes,
    average: Math.round(average * 100) / 100,
    window: `${smoother.recentStakes.length}/${smoother.maxWindow}`,
  }
}
