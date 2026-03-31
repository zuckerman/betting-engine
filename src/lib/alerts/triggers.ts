import { SystemHealth } from "./checkHealth";

export function evaluateAlerts(health: SystemHealth): string[] {
  const alerts: string[] = [];

  if (health.clv < -0.02) {
    alerts.push("⚠️ CLV NEGATIVE — model losing edge to market");
  }

  if (health.roi < -0.1) {
    alerts.push("📉 ROI SEVERE DRAWDOWN — recent performance poor");
  }

  if (health.clv > 0.02 && health.roi < -0.05) {
    alerts.push(
      "🤔 Positive CLV but negative ROI — possible execution/variance issue"
    );
  }

  if (health.sampleSize < 30) {
    alerts.push("⏳ Small sample size — confidence low");
  }

  return alerts;
}
