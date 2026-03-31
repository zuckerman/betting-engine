/**
 * Adaptive Bet Evaluation Endpoint
 * POST /api/bet/adaptive-evaluate
 * Evaluates bets using the adaptive system (probability adjustment, segment weighting, dynamic thresholds)
 */

import { NextRequest, NextResponse } from "next/server";
import { evaluateAdaptiveBets, generateAdaptiveReport, buildAdaptiveContext } from "@/lib/engine/adaptiveExecution";
import { getAllBets } from "@/lib/engine/bettingService";
import { calibrationReport } from "@/lib/engine/calibration";
import { calculatePortfolioMetrics } from "@/lib/engine/portfolioMetrics";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bets = [], bankroll = 1000, custom_context } = body;

    if (!Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json(
        { error: "Provide array of bets to evaluate" },
        { status: 400 }
      );
    }

    // Get all existing bets for calibration
    const allBets = getAllBets();
    const settledBets = allBets.filter((b) => b.status === "settled");

    // Build calibration context
    const calResults = calibrationReport(settledBets);
    const metrics = calculatePortfolioMetrics(allBets);

    // Get recent bets (last 50)
    const recentBets = settledBets.slice(-50).map((b) => ({
      won: b.won ?? false,
      modelProb: b.model_probability,
    }));

    // Calculate total calibration error from results
    const overconfident = calResults.filter((r) => r.status === "overconfident");
    const avgError = overconfident.length > 0
      ? overconfident.reduce((sum, r) => sum + Math.abs(r.error), 0) / overconfident.length
      : 0;

    // Build adaptive context
    const context = custom_context || buildAdaptiveContext({
      totalCalibrationError: avgError,
      recentBets,
      segmentWeights: new Map([["default", 1.0]]),
    });

    // Evaluate all bets
    const decisions = evaluateAdaptiveBets(bets, bankroll, context);

    // Generate report
    const report = generateAdaptiveReport(decisions);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      context: {
        calibrationError: avgError,
        modelReliability: calResults[0]?.status || "unknown",
        recentAccuracy: recentBets.length > 0
          ? recentBets.filter((b) => b.won).length / recentBets.length
          : 0.5,
      },
      portfolio: {
        totalBets: metrics.totalBets,
        totalProfit: metrics.totalProfit,
        roi: metrics.roi,
        winRate: metrics.winRate,
        avgEdge: metrics.avgEdge,
      },
      calibration: calResults,
      decisions: report,
    });
  } catch (error) {
    console.error("Adaptive evaluation error:", error);
    return NextResponse.json(
      { error: "Evaluation failed" },
      { status: 500 }
    );
  }
}
