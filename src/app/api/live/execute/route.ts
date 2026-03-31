/**
 * Live Execution Endpoint
 * POST /api/live/execute
 * Executes bets from live signals
 */

import { NextRequest, NextResponse } from "next/server";
import { liveExecutor } from "@/lib/live/liveExecution";
import { getTelegramAlerts } from "@/lib/alerts/telegram";
import { getAllBets } from "@/lib/engine/bettingService";
import { calibrationReport } from "@/lib/engine/calibration";
import { buildAdaptiveContext } from "@/lib/engine/adaptiveExecution";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signal, bet, bankroll = 1000, send_alerts = false } = body;

    if (!signal || !bet) {
      return NextResponse.json(
        { error: "Provide signal and bet" },
        { status: 400 }
      );
    }

    // Build adaptive context from portfolio
    const allBets = getAllBets();
    const settledBets = allBets.filter((b) => b.status === "settled");
    const calResults = calibrationReport(settledBets);

    const overconfident = calResults.filter((r) => r.status === "overconfident");
    const avgError = overconfident.length > 0
      ? overconfident.reduce((sum, r) => sum + Math.abs(r.error), 0) / overconfident.length
      : 0;

    const recentBets = settledBets.slice(-50).map((b) => ({
      won: b.won ?? false,
      modelProb: b.model_probability,
    }));

    const context = buildAdaptiveContext({
      totalCalibrationError: avgError,
      recentBets,
      segmentWeights: new Map([["default", 1.0]]),
    });

    // Execute
    const execution = await liveExecutor.execute(signal, bet, bankroll, context);

    // Send alerts if enabled
    if (send_alerts && execution.status === "CONFIRMED") {
      const alerts = getTelegramAlerts();
      if (execution.decision.action === "BET") {
        await alerts.alertExecution(execution);
      }
    }

    return NextResponse.json({
      success: true,
      execution,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { error: "Execution failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/live/execute
 * Get execution history and stats
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;

    const history = liveExecutor.getHistory(limit);
    const stats = liveExecutor.getStats();

    return NextResponse.json({
      success: true,
      history,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get execution error:", error);
    return NextResponse.json(
      { error: "Failed to get execution history" },
      { status: 500 }
    );
  }
}
