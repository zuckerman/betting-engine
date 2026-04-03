/**
 * Alert Integration - Plugs alerts into settlement & betting pipeline
 * Monitors critical metrics and sends real-time notifications
 */

import { ALERTS } from "./alerts"

interface BetPlacedEvent {
  matchId: string
  match: string
  odds: number
  edge: number
  stake: number
  tier: string
}

interface SettlementMetrics {
  clv: number
  result: "win" | "loss"
  timestamp: Date
}

interface PortfolioSnapshot {
  bankroll: number
  totalStaked: number
  dailyExposure: number
  drawdown: number
  activeBets: number
  avgClv: number
}

/**
 * Called when a new bet is placed
 */
export async function onBetPlaced(event: BetPlacedEvent, portfolio: PortfolioSnapshot) {
  try {
    // Check if it's a high-edge signal (A+)
    if (event.edge >= ALERTS.CONFIG.HIGH_EDGE_THRESHOLD) {
      await ALERTS.alertHighEdgeBet(event.match, event.odds, event.edge, event.tier)
    }

    // Check daily exposure after bet
    if (
      portfolio.dailyExposure >= ALERTS.CONFIG.DAILY_EXPOSURE_WARNING &&
      portfolio.dailyExposure - event.stake < ALERTS.CONFIG.DAILY_EXPOSURE_WARNING
    ) {
      // Just crossed warning threshold
      await ALERTS.checkExposureAlert(portfolio.dailyExposure, portfolio.dailyExposure - event.stake)
    }
  } catch (err) {
    console.error("[BET_PLACED_ALERT_ERROR]", err)
  }
}

/**
 * Called when a bet settles
 */
export async function onBetSettled(
  result: SettlementMetrics,
  metrics: {
    sampleSize: number
    avgClv: number
    prevAvgClv: number
  },
  portfolio: PortfolioSnapshot
) {
  try {
    // Check if CLV turned negative (bad signal)
    if (
      metrics.avgClv < ALERTS.CONFIG.CLV_NEGATIVE &&
      metrics.prevAvgClv >= ALERTS.CONFIG.CLV_NEGATIVE &&
      metrics.sampleSize > 50
    ) {
      await ALERTS.checkCLVAlert(metrics.avgClv, metrics.sampleSize)
    }

    // Check drawdown after settlement
    if (portfolio.drawdown >= ALERTS.CONFIG.DRAWDOWN_WARNING) {
      // Calculate previous drawdown (rough estimate)
      const previousDrawdown = portfolio.drawdown - (result.clv > 0 ? 0.002 : 0.005)
      await ALERTS.checkDrawdownAlert(portfolio.drawdown, previousDrawdown)
    }
  } catch (err) {
    console.error("[SETTLEMENT_ALERT_ERROR]", err)
  }
}

/**
 * Called on any system error
 */
export async function onSystemError(error: Error, context: string) {
  try {
    await ALERTS.alertSystemError(`${context}\n\nError: ${error.message}`)
  } catch (err) {
    console.error("[SYSTEM_ERROR_ALERT_FAILED]", err)
  }
}

/**
 * Daily health check - send summary
 */
export async function sendDailyHealthCheck(stats: {
  date: string
  betsPlaced: number
  avgClv: number
  beatMarket: number
  dayPnL: number
  drawdown: number
  status: string
  errors: number
}) {
  try {
    const status =
      stats.errors > 0
        ? "⚠️ Errors Detected"
        : stats.avgClv > 0
          ? "✅ Healthy"
          : stats.avgClv < 0
            ? "❌ Negative Edge"
            : "🟡 Monitoring"

    await ALERTS.sendDailySummary({
      date: stats.date,
      betsPlaced: stats.betsPlaced,
      avgClv: stats.avgClv,
      beatMarket: stats.beatMarket,
      dayPnL: stats.dayPnL,
      drawdown: stats.drawdown,
      status,
    })
  } catch (err) {
    console.error("[DAILY_HEALTH_CHECK_ERROR]", err)
  }
}

/**
 * Export integration hooks
 */
export const ALERT_INTEGRATION = {
  onBetPlaced,
  onBetSettled,
  onSystemError,
  sendDailyHealthCheck,
}
