/**
 * Alert System - Telegram-based alerts for critical events
 * Sends real-time notifications for system events
 */

interface AlertContext {
  severity: "info" | "warning" | "critical"
  metric?: string
  value?: string | number
  threshold?: string | number
  timestamp?: Date
}

const ALERT_CONFIG = {
  DRAWDOWN_WARNING: 0.15, // 15% drawdown = warning
  DRAWDOWN_CRITICAL: 0.25, // 25% drawdown = critical (pause)
  CLV_NEGATIVE: 0, // CLV drops below 0
  DAILY_EXPOSURE_WARNING: 0.15, // 15% daily exposure
  DAILY_EXPOSURE_CRITICAL: 0.25, // 25% daily exposure
  HIGH_EDGE_THRESHOLD: 0.08, // A+ bets (8%+ edge)
  SYSTEM_ERROR_THRESHOLD: 1, // Any system error
}

export async function sendTelegramAlert(
  title: string,
  message: string,
  context?: AlertContext
) {
  const token = process.env.TELEGRAM_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.log("[ALERT - NO CONFIG]", title, message)
    return
  }

  const emoji = {
    info: "ℹ️",
    warning: "⚠️",
    critical: "🚨",
  }[context?.severity || "info"]

  const fullMessage = `
${emoji} **${title}**

${message}
${context?.metric ? `\n📊 ${context.metric}: ${context.value}` : ""}
${context?.threshold ? `\n📍 Threshold: ${context.threshold}` : ""}
${context?.timestamp ? `\n🕐 ${context.timestamp.toISOString()}` : ""}
  `.trim()

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: fullMessage,
        parse_mode: "Markdown",
      }),
    })
  } catch (err) {
    console.error("[TELEGRAM ERROR]", err)
  }
}

/**
 * Drawdown Alert
 */
export async function checkDrawdownAlert(
  drawdown: number,
  previousDrawdown: number
) {
  // Crossed warning threshold
  if (
    drawdown >= ALERT_CONFIG.DRAWDOWN_WARNING &&
    previousDrawdown < ALERT_CONFIG.DRAWDOWN_WARNING
  ) {
    await sendTelegramAlert(
      "Drawdown Warning",
      "Portfolio drawdown exceeded warning threshold. Monitor closely.",
      {
        severity: "warning",
        metric: "Drawdown",
        value: `${(drawdown * 100).toFixed(1)}%`,
        threshold: `${ALERT_CONFIG.DRAWDOWN_WARNING * 100}%`,
      }
    )
  }

  // Crossed critical threshold
  if (
    drawdown >= ALERT_CONFIG.DRAWDOWN_CRITICAL &&
    previousDrawdown < ALERT_CONFIG.DRAWDOWN_CRITICAL
  ) {
    await sendTelegramAlert(
      "CRITICAL: Drawdown Limit Hit",
      "Portfolio drawdown exceeded critical threshold. System PAUSED.",
      {
        severity: "critical",
        metric: "Drawdown",
        value: `${(drawdown * 100).toFixed(1)}%`,
        threshold: `${ALERT_CONFIG.DRAWDOWN_CRITICAL * 100}%`,
      }
    )
  }
}

/**
 * CLV Alert
 */
export async function checkCLVAlert(clv: number, sampleSize: number) {
  if (clv < ALERT_CONFIG.CLV_NEGATIVE && sampleSize > 50) {
    await sendTelegramAlert(
      "CLV Negative",
      `Average CLV has turned negative. No edge detected.`,
      {
        severity: "warning",
        metric: "Avg CLV",
        value: `${(clv * 100).toFixed(2)}%`,
        threshold: "0%",
      }
    )
  }
}

/**
 * Exposure Alert
 */
export async function checkExposureAlert(
  dailyExposure: number,
  previousExposure: number
) {
  // Crossed warning
  if (
    dailyExposure >= ALERT_CONFIG.DAILY_EXPOSURE_WARNING &&
    previousExposure < ALERT_CONFIG.DAILY_EXPOSURE_WARNING
  ) {
    await sendTelegramAlert(
      "High Daily Exposure",
      "Daily risk exposure is elevated. Reduce bet sizing.",
      {
        severity: "warning",
        metric: "Daily Exposure",
        value: `${(dailyExposure * 100).toFixed(1)}%`,
        threshold: `${ALERT_CONFIG.DAILY_EXPOSURE_WARNING * 100}%`,
      }
    )
  }

  // Crossed critical
  if (
    dailyExposure >= ALERT_CONFIG.DAILY_EXPOSURE_CRITICAL &&
    previousExposure < ALERT_CONFIG.DAILY_EXPOSURE_CRITICAL
  ) {
    await sendTelegramAlert(
      "CRITICAL: Exposure Limit",
      "Daily exposure exceeded limit. New bets blocked.",
      {
        severity: "critical",
        metric: "Daily Exposure",
        value: `${(dailyExposure * 100).toFixed(1)}%`,
        threshold: `${ALERT_CONFIG.DAILY_EXPOSURE_CRITICAL * 100}%`,
      }
    )
  }
}

/**
 * High-Edge Bet Alert (A+ signals)
 */
export async function alertHighEdgeBet(
  match: string,
  odds: number,
  edge: number,
  tier: string
) {
  if (edge >= ALERT_CONFIG.HIGH_EDGE_THRESHOLD) {
    await sendTelegramAlert(
      "🔥 High-Edge Bet Detected",
      `Strong signal found.
      
Match: ${match}
Odds: ${odds}
Edge: ${(edge * 100).toFixed(2)}%
Tier: ${tier}`,
      {
        severity: "info",
        metric: "Edge",
        value: `${(edge * 100).toFixed(2)}%`,
      }
    )
  }
}

/**
 * System Health Alert
 */
export async function alertSystemError(error: string) {
  await sendTelegramAlert(
    "System Error",
    `Critical system error detected.\n\n${error}`,
    {
      severity: "critical",
    }
  )
}

/**
 * Daily Summary Alert
 */
export async function sendDailySummary(stats: {
  date: string
  betsPlaced: number
  avgClv: number
  beatMarket: number
  dayPnL: number
  drawdown: number
  status: string
}) {
  const message = `
📊 **Daily Summary** - ${stats.date}

Bets Placed: ${stats.betsPlaced}
Avg CLV: ${(stats.avgClv * 100).toFixed(2)}%
Beat Market: ${stats.beatMarket}%
Day PnL: £${stats.dayPnL.toFixed(2)}
Drawdown: ${(stats.drawdown * 100).toFixed(1)}%
Status: ${stats.status}
  `.trim()

  await sendTelegramAlert("Daily Summary", message, {
    severity: "info",
  })
}

export const ALERTS = {
  CONFIG: ALERT_CONFIG,
  sendTelegramAlert,
  checkDrawdownAlert,
  checkCLVAlert,
  checkExposureAlert,
  alertHighEdgeBet,
  alertSystemError,
  sendDailySummary,
}
