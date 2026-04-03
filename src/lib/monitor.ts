/**
 * System Monitor - Runs as periodic health check
 * Can be called by cron job or monitoring service
 */

import { createClient } from "@supabase/supabase-js"
import { ALERTS } from "./alerts"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MonitoringReport {
  timestamp: Date
  alerts: string[]
  metrics: {
    totalBets: number
    activeBets: number
    avgClv: number
    drawdown: number
    dailyExposure: number
    beatMarket: number
  }
  status: "healthy" | "warning" | "critical"
}

/**
 * Main monitoring function
 */
export async function monitorSystem(): Promise<MonitoringReport> {
  const alerts: string[] = []
  const now = new Date()

  try {
    // Get today's predictions
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    const { data: todayBets, error: betsError } = await supabase
      .from("predictions")
      .select("*")
      .gte("created_at", startOfDay.toISOString())

    if (betsError) {
      throw new Error(`Failed to fetch today's bets: ${betsError.message}`)
    }

    // Calculate metrics
    const activeBets = todayBets?.filter((b) => b.status === "pending").length || 0
    const settledBets = todayBets?.filter((b) => b.status === "settled") || []
    const totalBets = todayBets?.length || 0

    // CLV calculation
    const clvValues = settledBets
      .filter((b) => b.real_clv !== null)
      .map((b) => b.real_clv)
    const avgClv = clvValues.length > 0 ? clvValues.reduce((a, b) => a + b, 0) / clvValues.length : 0

    // Win rate
    const winCount = settledBets.filter((b) => b.result === "win").length
    const beatMarket = settledBets.length > 0 ? (winCount / settledBets.length) * 100 : 0

    // Simulate drawdown (would be from bankroll table in real system)
    const drawdown = 0.12 // Placeholder

    // Daily exposure
    const totalStaked = todayBets?.reduce((sum, b) => sum + (b.stake || 0), 0) || 0
    const dailyExposure = totalStaked / 10000 // Assuming 10k bankroll

    // Check alert thresholds
    if (drawdown >= ALERTS.CONFIG.DRAWDOWN_CRITICAL) {
      alerts.push(`🚨 CRITICAL: Drawdown ${(drawdown * 100).toFixed(1)}%`)
      await ALERTS.sendTelegramAlert(
        "System Monitor: CRITICAL",
        `Drawdown exceeded ${(ALERTS.CONFIG.DRAWDOWN_CRITICAL * 100)}% threshold!`,
        {
          severity: "critical",
          metric: "Drawdown",
          value: `${(drawdown * 100).toFixed(1)}%`,
        }
      )
    }

    if (avgClv < 0 && totalBets > 50) {
      alerts.push(`⚠️ WARNING: Negative CLV ${(avgClv * 100).toFixed(2)}%`)
      await ALERTS.sendTelegramAlert(
        "System Monitor: Negative CLV",
        `Average CLV is negative after ${totalBets} bets`,
        {
          severity: "warning",
          metric: "Avg CLV",
          value: `${(avgClv * 100).toFixed(2)}%`,
        }
      )
    }

    if (dailyExposure >= ALERTS.CONFIG.DAILY_EXPOSURE_CRITICAL) {
      alerts.push(`🚨 CRITICAL: Daily exposure ${(dailyExposure * 100).toFixed(1)}%`)
      await ALERTS.sendTelegramAlert(
        "System Monitor: HIGH EXPOSURE",
        `Daily exposure exceeded ${(ALERTS.CONFIG.DAILY_EXPOSURE_CRITICAL * 100)}% limit!`,
        {
          severity: "critical",
          metric: "Daily Exposure",
          value: `${(dailyExposure * 100).toFixed(1)}%`,
        }
      )
    }

    if (activeBets === 0 && totalBets < 3) {
      alerts.push(`ℹ️ INFO: Low bet volume today (${totalBets} bets)`)
    }

    // Determine status
    let status: "healthy" | "warning" | "critical" = "healthy"
    if (alerts.some((a) => a.startsWith("🚨"))) {
      status = "critical"
    } else if (alerts.some((a) => a.startsWith("⚠️"))) {
      status = "warning"
    }

    return {
      timestamp: now,
      alerts,
      metrics: {
        totalBets,
        activeBets,
        avgClv,
        drawdown,
        dailyExposure,
        beatMarket,
      },
      status,
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error("[MONITOR_ERROR]", error)

    await ALERTS.alertSystemError(`System monitor error: ${error.message}`)

    return {
      timestamp: now,
      alerts: [`💥 System error: ${error.message}`],
      metrics: {
        totalBets: 0,
        activeBets: 0,
        avgClv: 0,
        drawdown: 0,
        dailyExposure: 0,
        beatMarket: 0,
      },
      status: "critical",
    }
  }
}

/**
 * Health check endpoint - can be called by monitoring service (e.g., UptimeRobot)
 */
export async function getSystemHealth() {
  const report = await monitorSystem()

  return {
    ok: report.status !== "critical",
    status: report.status,
    alerts: report.alerts,
    metrics: report.metrics,
    timestamp: report.timestamp,
  }
}

export const MONITOR = {
  monitorSystem,
  getSystemHealth,
}
