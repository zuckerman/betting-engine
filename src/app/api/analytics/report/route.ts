/**
 * GET /api/analytics/report
 * 
 * Complete analytics dashboard data
 * Includes: calibration, edge validation, execution report
 */

import { getAllBets } from "@/lib/engine/bettingService";
import { calibrationReport, calibrationHealth } from "@/lib/engine/calibration";
import { edgeValidation, edgeHealth } from "@/lib/engine/edgeValidation";
import { calculatePortfolioMetrics } from "@/lib/engine/portfolioMetrics";

export async function GET() {
  try {
    const bets = getAllBets();

    const calibration = calibrationReport(bets);
    const calibrationStatus = calibrationHealth(bets);

    const edgeValidationReport = edgeValidation(bets);
    const edgeStatus = edgeHealth(bets);

    const metrics = calculatePortfolioMetrics(bets);

    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      portfolio: {
        total_bets: metrics.totalBets,
        total_profit: metrics.totalProfit,
        total_stake: metrics.totalStake,
        roi: (metrics.roi * 100).toFixed(2) + "%",
        win_rate: (metrics.winRate * 100).toFixed(2) + "%",
        avg_edge: (metrics.avgEdge * 100).toFixed(2) + "%",
      },
      calibration: {
        health: calibrationStatus.healthy ? "✓ Healthy" : "⚠ Issues",
        summary: calibrationStatus.summary,
        avg_error: (calibrationStatus.avgError * 100).toFixed(2) + "%",
        warnings: calibrationStatus.warnings,
        breakdown: calibration.map((c) => ({
          probability_range: c.bucket.label,
          bets: c.count,
          expected: (c.expected * 100).toFixed(2) + "%",
          actual: (c.actual * 100).toFixed(2) + "%",
          error: (c.error * 100).toFixed(2) + "%",
          status: c.status,
        })),
      },
      edge: {
        health: edgeStatus.healthy ? "✓ Healthy" : "⚠ Issues",
        summary: edgeStatus.summary,
        usable_buckets: edgeStatus.usableBuckets,
        warnings: edgeStatus.warnings,
        breakdown: edgeValidationReport.map((e) => ({
          edge_range: e.bucket.label,
          bets: e.count,
          win_rate: (e.winRate * 100).toFixed(2) + "%",
          roi: (e.roi * 100).toFixed(2) + "%",
          total_stake: e.totalStake,
          total_profit: e.totalProfit,
          usable: e.isUsable,
        })),
      },
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return Response.json(
      { error: error.message || "Analytics failed" },
      { status: 500 }
    );
  }
}
