/**
 * Live Signals Endpoint
 * POST /api/live/signals
 * Generate and retrieve live trading signals
 */

import { NextRequest, NextResponse } from "next/server";
import { generateSignals, filterSignals, prioritizeSignals, groupByFixture, getSummary } from "@/lib/live/signalEngine";
import { oddsPoller } from "@/lib/live/oddsPoller";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { predictions = [], min_edge = 0.02, min_strength = 0.5, urgency } = body;

    if (!Array.isArray(predictions) || predictions.length === 0) {
      return NextResponse.json(
        { error: "Provide array of predictions" },
        { status: 400 }
      );
    }

    // Generate all signals
    const allSignals = generateSignals(predictions, min_edge);

    // Filter by strength
    let filtered = filterSignals(allSignals, min_strength);

    // Filter by urgency if specified
    if (urgency) {
      filtered = filtered.filter((s) => s.urgency === urgency);
    }

    // Prioritize
    const prioritized = prioritizeSignals(filtered);

    // Group by fixture
    const grouped = groupByFixture(prioritized);

    // Summary
    const summary = getSummary(prioritized);

    return NextResponse.json({
      success: true,
      signals: prioritized,
      grouped: Object.fromEntries(grouped),
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Signal generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate signals" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/live/signals
 * Get current odds status and market activity
 */
export async function GET() {
  try {
    const status = oddsPoller.getStatus();
    const sharpMoves = oddsPoller.detectSharpMoney(0.02);
    const volatileMarkets = oddsPoller.detectVolatility(0.05);

    return NextResponse.json({
      success: true,
      status,
      market_activity: {
        sharp_moves: sharpMoves.length,
        volatile_markets: volatileMarkets.length,
      },
      sharp_moves: sharpMoves.slice(0, 10), // Top 10
      volatile_markets: volatileMarkets.slice(0, 10), // Top 10
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get signals error:", error);
    return NextResponse.json(
      { error: "Failed to get signals" },
      { status: 500 }
    );
  }
}
