import { NextRequest, NextResponse } from "next/server";
import { scoreBets } from "@/lib/engine/metricsService";
import { Bet } from "@/lib/engine/types";

/**
 * POST /api/bettor/score
 *
 * Request body:
 * {
 *   "bets": [
 *     {
 *       "odds_taken": 1.95,
 *       "odds_closing": 1.92,
 *       "stake": 100,
 *       "result": "win",
 *       "market_type": "moneyline",
 *       "league": "NBA"
 *     },
 *     ...
 *   ]
 * }
 *
 * Response:
 * {
 *   "state": "AMBER",
 *   "metrics": { ... },
 *   "diagnosis": "...",
 *   "instruction": "...",
 *   "riskFlags": [...]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bets } = body;

    // Validate input
    if (!Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json(
        { error: "Invalid input: 'bets' must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each bet has required fields
    const validatedBets: Bet[] = bets.map((bet: any) => {
      if (
        typeof bet.odds_taken !== "number" ||
        typeof bet.odds_closing !== "number" ||
        typeof bet.stake !== "number" ||
        !["win", "loss", "push"].includes(bet.result)
      ) {
        throw new Error(
          "Each bet must have: odds_taken, odds_closing, stake, result"
        );
      }

      return {
        odds_taken: bet.odds_taken,
        odds_closing: bet.odds_closing,
        stake: bet.stake,
        result: bet.result,
        market_type: bet.market_type,
        league: bet.league,
        odds_range: bet.odds_range,
        settled_at: bet.settled_at ? new Date(bet.settled_at) : undefined,
      };
    });

    // Score the bets
    const result = scoreBets(validatedBets);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
