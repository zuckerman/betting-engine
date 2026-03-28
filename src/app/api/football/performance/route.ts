import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/football/performance
 * 
 * Calculate prediction accuracy, ROI, and performance metrics
 */
export async function GET() {
  try {
    // Get all predictions with results
    const predictions = await prisma.prediction.findMany({
      include: {
        match: true,
      },
      where: {
        match: {
          result: { not: null },
        },
      },
    });

    if (predictions.length === 0) {
      return NextResponse.json({
        total_matches: 0,
        correct_predictions: 0,
        accuracy: 0,
        roi: 0,
        total_profit: 0,
        message: "No completed predictions yet",
      });
    }

    let correct = 0;
    let totalProfit = 0;
    let betCount = 0;

    predictions.forEach((pred) => {
      const actualResult = pred.match.result;

      // Check if prediction was correct
      if (pred.predictedResult === actualResult) {
        correct++;

        // Calculate profit for this bet
        const odds =
          pred.predictedResult === "home_win"
            ? pred.homeOdds
            : pred.predictedResult === "draw"
              ? pred.drawOdds
              : pred.awayOdds;

        // Profit = (odds - 1) * stake (assuming 1 unit stake)
        totalProfit += odds - 1;
      } else {
        // Lost bet = -1 unit
        totalProfit -= 1;
      }

      betCount++;
    });

    const accuracy = correct / predictions.length;
    const roi = (totalProfit / betCount) * 100; // as percentage

    // Also calculate by confidence level
    const predictions_by_confidence = predictions.map((p) => {
      const confidence = Math.max(p.homeWinProb, p.drawProb, p.awayWinProb);
      return {
        ...p,
        confidence,
        was_correct: p.predictedResult === p.match.result,
      };
    });

    const high_confidence = predictions_by_confidence.filter(
      (p) => p.confidence > 0.6
    );

    return NextResponse.json({
      summary: {
        total_matches: predictions.length,
        correct_predictions: correct,
        accuracy: parseFloat(accuracy.toFixed(4)),
        roi: parseFloat(roi.toFixed(2)),
        total_profit: parseFloat(totalProfit.toFixed(2)),
      },
      by_confidence: {
        high_confidence_count: high_confidence.length,
        high_confidence_accuracy:
          high_confidence.length > 0
            ? (
                high_confidence.filter((p) => p.was_correct).length /
                high_confidence.length
              ).toFixed(4)
            : "N/A",
      },
      last_updated: new Date(),
    });
  } catch (error: any) {
    console.error("Performance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate performance" },
      { status: 500 }
    );
  }
}
