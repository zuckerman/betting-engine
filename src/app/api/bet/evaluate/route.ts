/**
 * POST /api/bet/evaluate
 * 
 * Decision engine: Filter + Kelly sizing
 * Input: bet + bankroll
 * Output: BET/REJECT with optimal stake
 */

import { PredictionBet } from "@/lib/engine/types";
import { evaluateBet, generateExecutionReport } from "@/lib/engine/execution";

export async function POST(req: Request) {
  try {
    const { bets, bankroll } = await req.json();

    // Handle single bet
    if (!Array.isArray(bets)) {
      const decision = evaluateBet(bets as PredictionBet, bankroll);
      return Response.json({
        status: "evaluated",
        decision,
      });
    }

    // Handle multiple bets
    const report = generateExecutionReport(bets as PredictionBet[], bankroll);

    return Response.json({
      status: "evaluated",
      report,
    });
  } catch (error: any) {
    console.error("Evaluation error:", error);
    return Response.json(
      { error: error.message || "Evaluation failed" },
      { status: 500 }
    );
  }
}
