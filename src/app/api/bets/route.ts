/**
 * POST /api/bets
 * 
 * Place a new bet
 * Called after prediction accepts it (should_bet = true)
 */

import { PredictionBet } from "@/lib/engine/types"
import { saveBet } from "@/lib/engine/bettingService"

export async function POST(req: Request) {
  try {
    const {
      fixture_id,
      prediction,
      odds_taken,
      odds_closing,
      model_probability,
      stake,
    } = await req.json()

    // Validate required fields
    if (!fixture_id || !prediction || !odds_taken || !stake || model_probability === undefined) {
      return Response.json(
        { error: "Missing required fields: fixture_id, prediction, odds_taken, model_probability, stake" },
        { status: 400 }
      )
    }

    // Validate prediction
    if (!["home_win", "away_win", "draw"].includes(prediction)) {
      return Response.json(
        { error: "Invalid prediction. Must be: home_win, away_win, or draw" },
        { status: 400 }
      )
    }

    // Validate probabilities
    if (model_probability < 0 || model_probability > 1) {
      return Response.json(
        { error: "model_probability must be between 0 and 1" },
        { status: 400 }
      )
    }

    // Calculate implied market probability
    const marketProb = 1 / odds_taken;
    const edge = model_probability - marketProb;

    // Create bet
    const bet: PredictionBet = {
      id: `bet_${fixture_id}_${Date.now()}`,
      fixture_id,
      prediction,
      odds_taken,
      odds_closing,
      model_probability,
      stake,
      status: "open",
    }

    // Save
    saveBet(bet)

    return Response.json({
      status: "placed",
      bet,
      analysis: {
        model_probability: model_probability.toFixed(4),
        market_probability: marketProb.toFixed(4),
        edge: edge.toFixed(4),
        edge_percentage: `${(edge * 100).toFixed(2)}%`,
      }
    })
  } catch (error: any) {
    console.error("Bet placement error:", error)
    return Response.json(
      { error: error.message || "Failed to place bet" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const { getAllBets } = await import("@/lib/engine/bettingService")
  const bets = getAllBets()

  return Response.json({
    total: bets.length,
    bets,
  })
}
