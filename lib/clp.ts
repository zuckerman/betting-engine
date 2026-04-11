/**
 * Closing Line Prediction (CLP)
 *
 * Predicts where the market will move before kickoff
 * Key insight: Market doesn't immediately reflect all information
 * Edge gets partially compressed as more money enters
 */

/**
 * Predict closing odds based on entry odds and detected edge
 *
 * Formula:
 * - Market prices in vig + some edge awareness
 * - As time passes, more sharp money enters → compression
 * - We estimate: how much will closing line compress from current?
 */
export function predictClosingOdds({
  entryOdds,
  modelProbability,
  edgePercent,
  timeToKickoffHours,
}: {
  entryOdds: number
  modelProbability: number // 0-1
  edgePercent: number // 0.02 = 2%
  timeToKickoffHours: number
}): number {
  // Edge compression factor depends on time to kickoff
  // Early: high variance, large potential moves
  // Late: mostly settled, small moves
  const compressionFactor = getCompressionFactor(timeToKickoffHours)

  // How much the market will move toward fair odds
  const expectedMovement = edgePercent * compressionFactor

  // Closing odds = current odds adjusted by expected compression
  // If we have +5% edge, market will move ~60% toward fair line
  const predictedClosingOdds = entryOdds / (1 + expectedMovement)

  return Math.max(1.01, parseFloat(predictedClosingOdds.toFixed(3)))
}

/**
 * Compression factor based on time to kickoff
 *
 * Early market: low factor (big moves possible)
 * Late market: high factor (mostly compressed already)
 */
function getCompressionFactor(hoursToKickoff: number): number {
  if (hoursToKickoff > 48) return 0.3  // Early: market still learning
  if (hoursToKickoff > 24) return 0.45 // Day before: moderate movement
  if (hoursToKickoff > 6) return 0.6   // Hours before: most compression done
  return 0.75 // Late: very little room for moves
}

/**
 * Calculate actual market movement post-settlement
 *
 * Positive = market moved against your bet (bad)
 * Negative = market moved with your bet (good)
 */
export function calculateMarketMovement(
  entryOdds: number,
  closingOdds: number
): number {
  // Movement as percentage change
  const movement = (closingOdds - entryOdds) / entryOdds

  return parseFloat(movement.toFixed(4))
}

/**
 * Calculate CLP error (prediction accuracy)
 *
 * How far was our prediction from actual?
 * Low error = good predictive power
 * High error = market moved unexpectedly
 */
export function calculateCLPError(
  predictedClosingOdds: number,
  actualClosingOdds: number
): number {
  if (actualClosingOdds === 0) return 0

  const error = (predictedClosingOdds - actualClosingOdds) / actualClosingOdds

  return parseFloat(error.toFixed(4))
}

/**
 * Signal quality score (composite metric)
 *
 * Combines:
 * - CLV (did you make money?)
 * - Movement (did market move with you?)
 * - CLP accuracy (did you predict market correctly?)
 */
export function calculateSignalQuality({
  clv,
  movement,
  clpError,
}: {
  clv: number // -0.05 to +0.05 range typical
  movement: number // -0.1 to +0.1 range typical
  clpError: number // 0 to +0.2 range typical
}): number {
  // Weights represent what matters
  const weights = {
    clv: 0.5, // Outcome matters most
    movement: 0.3, // Market behavior matters
    clpAccuracy: 0.2, // Prediction accuracy
  }

  // Normalize to 0-1 scale
  const clvScore = Math.max(0, Math.min(1, (clv + 0.05) / 0.1))
  const movementScore = Math.max(0, Math.min(1, (-movement + 0.1) / 0.2))
  const clpScore = Math.max(0, 1 - Math.abs(clpError))

  const quality =
    clvScore * weights.clv +
    movementScore * weights.movement +
    clpScore * weights.clpAccuracy

  return parseFloat(quality.toFixed(3))
}

/**
 * Bucket edge into categories for analysis
 */
export function getEdgeBucket(edgePercent: number): string {
  const edge = edgePercent * 100 // Convert to percentage

  if (edge < 2) return 'noise'
  if (edge < 3) return 'low_0_3'
  if (edge < 5) return 'medium_3_5'
  if (edge < 10) return 'high_5_10'
  return 'very_high_10_plus'
}

/**
 * Calculate time to kickoff in hours
 */
export function getTimeToKickoffHours(kickoffTime: Date): number {
  const now = new Date()
  const hours = (kickoffTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  return Math.max(0, Math.round(hours))
}

/**
 * Debug helper for CLP system
 */
export function getCLPDebug({
  entryOdds,
  modelProb,
  edge,
  timeToKickoff,
  actualClosingOdds,
  actualMovement,
}: {
  entryOdds: number
  modelProb: number
  edge: number
  timeToKickoff: number
  actualClosingOdds?: number
  actualMovement?: number
}) {
  const predicted = predictClosingOdds({
    entryOdds,
    modelProbability: modelProb,
    edgePercent: edge,
    timeToKickoffHours: timeToKickoff,
  })

  const compression = getCompressionFactor(timeToKickoff)

  const result = {
    entry: entryOdds,
    predicted: predicted,
    compression_factor: compression,
    model_prob: modelProb,
    edge_percent: (edge * 100).toFixed(2) + '%',
    time_to_kickoff_hours: timeToKickoff,
  }

  if (actualClosingOdds !== undefined && actualMovement !== undefined) {
    const error = calculateCLPError(predicted, actualClosingOdds)
    const quality = calculateSignalQuality({
      clv: actualMovement * (modelProb - 1 / entryOdds),
      movement: actualMovement,
      clpError: error,
    })

    return {
      ...result,
      actual: actualClosingOdds,
      clp_error: error,
      signal_quality: quality,
    }
  }

  return result
}
