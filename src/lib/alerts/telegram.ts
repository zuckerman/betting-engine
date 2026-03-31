/**
 * Telegram Alerts System
 * Sends betting notifications and alerts
 */

import { ExecutionEvent } from "../live/liveExecution";
import { LiveSignal } from "../live/signalEngine";

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export class TelegramAlerts {
  private config: TelegramConfig;
  private baseUrl: string = "https://api.telegram.org";

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  /**
   * Send raw message
   */
  private async sendMessage(text: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      const url = `${this.baseUrl}/bot${this.config.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text,
          parse_mode: "HTML",
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Telegram send failed:", error);
      return false;
    }
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  /**
   * Send bet execution alert
   */
  async alertExecution(event: ExecutionEvent): Promise<boolean> {
    if (event.decision.action !== "BET") return false;

    const text = `
<b>🎯 BET PLACED</b>

Fixture: ${event.signal.fixture_id}
Odds: ${event.signal.market_odds.toFixed(2)}
Edge: ${(event.signal.edge * 100).toFixed(2)}%
Stake: ${this.formatCurrency(event.decision.stake)}

Model: ${(event.signal.model_probability * 100).toFixed(1)}%
Market: ${(event.signal.market_probability * 100).toFixed(1)}%

Urgency: ${event.signal.urgency}
Risk: ${event.decision.riskLevel}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * Send signal alert (value detected)
   */
  async alertSignal(signal: LiveSignal): Promise<boolean> {
    const edgePercent = (signal.edge * 100).toFixed(2);
    const type =
      signal.type === "VALUE" ? "✅ VALUE" : signal.type === "SHARP_MOVE" ? "🔥 SHARP" : "⚠️ MISMATCH";

    const text = `
<b>${type} SIGNAL DETECTED</b>

Fixture: ${signal.fixture_id}
Market: ${signal.market}
Odds: ${signal.market_odds.toFixed(2)}
Edge: ${edgePercent}%

Model: ${(signal.model_probability * 100).toFixed(1)}%
Market: ${(signal.market_probability * 100).toFixed(1)}%

Strength: ${(signal.signal_strength * 100).toFixed(0)}%
Urgency: ${signal.urgency}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * Send portfolio update
   */
  async alertPortfolio(stats: {
    totalBets: number;
    totalProfit: number;
    roi: number;
    winRate: number;
    avgEdge: number;
  }): Promise<boolean> {
    const text = `
<b>📊 PORTFOLIO UPDATE</b>

Total Bets: ${stats.totalBets}
Total Profit: ${this.formatCurrency(stats.totalProfit)}
ROI: ${(stats.roi * 100).toFixed(2)}%
Win Rate: ${(stats.winRate * 100).toFixed(1)}%
Avg Edge: ${(stats.avgEdge * 100).toFixed(2)}%
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * Send alert when model reliability changes
   */
  async alertCalibration(error: number, status: string): Promise<boolean> {
    const emoji = status === "calibrated" ? "✅" : status === "overconfident" ? "⚠️" : "❌";

    const text = `
<b>${emoji} MODEL STATUS: ${status.toUpperCase()}</b>

Calibration Error: ${(Math.abs(error) * 100).toFixed(2)}%
Updated at: ${new Date().toLocaleTimeString()}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * Send error/warning alerts
   */
  async alertError(title: string, message: string): Promise<boolean> {
    const text = `
<b>⛔ ${title}</b>

${message}

Time: ${new Date().toLocaleTimeString()}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * Send startup confirmation
   */
  async alertStartup(): Promise<boolean> {
    const text = `
<b>🚀 BETTING ENGINE STARTED</b>

Live signal engine is now running.
Will alert on value opportunities.

${new Date().toLocaleString()}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * Send shutdown notification
   */
  async alertShutdown(): Promise<boolean> {
    const text = `
<b>🛑 BETTING ENGINE STOPPED</b>

${new Date().toLocaleString()}
    `.trim();

    return this.sendMessage(text);
  }

  /**
   * Test connection
   */
  async test(): Promise<boolean> {
    return this.sendMessage("✅ Telegram alerts configured and working!");
  }
}

// Singleton instance (initialized from environment variables)
let alerts: TelegramAlerts | null = null;

export function initializeTelegramAlerts(botToken?: string, chatId?: string): TelegramAlerts {
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN || "";
  const chat = chatId || process.env.TELEGRAM_CHAT_ID || "";
  const enabled = !!(token && chat);

  alerts = new TelegramAlerts({
    botToken: token,
    chatId: chat,
    enabled,
  });

  return alerts;
}

export function getTelegramAlerts(): TelegramAlerts {
  if (!alerts) {
    alerts = initializeTelegramAlerts();
  }
  return alerts;
}
