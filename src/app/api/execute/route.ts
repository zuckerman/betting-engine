import { NextRequest, NextResponse } from "next/server";
import { autoExecute } from "@/lib/execution/autoExecute";
import { getAllBets } from "@/lib/engine/bettingService";
import { calculatePortfolioMetrics } from "@/lib/engine/portfolioMetrics";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fixture_id, action, stake } = body;

    if (!fixture_id || !action || !stake) {
      return NextResponse.json(
        { error: "Missing fixture_id, action, or stake" },
        { status: 400 }
      );
    }

    // Get current portfolio metrics for safety checks
    const bets = getAllBets();
    const metrics = calculatePortfolioMetrics(bets);

    // Create decision object
    const decision = {
      fixture_id,
      action,
      stake,
      odds: 2.0, // TODO: pull from request
      model_prob: 0.55,
      market_prob: 0.5,
      edge: 0.05,
      timestamp: Date.now(),
    };

    // Execute with safety checks
    const result = await autoExecute(decision as any, {
      mode: "SEMI_AUTO",
      safetyContext: {
        drawdown: Math.abs(metrics.roi) > 0.2 ? Math.abs(metrics.roi) : 0,
        dailyLoss: 0,
        state: "GREEN",
        modelCalibrationError: 5,
        recentWinRate: metrics.winRate,
        totalBetsPlaced: metrics.totalBets,
        maxDailyBets: 50,
        bankroll: 10000,
        minBankroll: 5000,
      },
    });

    return NextResponse.json({
      success: result.reason !== "BLOCKED",
      bet_id: Math.random().toString(36).substring(7),
      reason: result.reason,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { error: "Execution failed" },
      { status: 500 }
    );
  }
}
