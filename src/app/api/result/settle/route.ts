/**
 * POST /api/result/settle
 * 
 * Complete settlement pipeline:
 * Sportmonks → Result extraction → Bet scoring → Portfolio metrics → Edge calibration
 */

import { fetchFixture } from "@/lib/sportmonks"
import { extractResult } from "@/lib/engine/settlement"
import { scoreBet } from "@/lib/engine/scoreBet"
import { calculatePortfolioMetrics } from "@/lib/engine/portfolioMetrics"
import { edgeCalibration, calibrationHealth } from "@/lib/engine/edge"
import {
  getBetByFixture,
  saveBet,
  getAllBets,
} from "@/lib/engine/bettingService"

export async function POST(req: Request) {
  try {
    const { fixture_id } = await req.json()

    if (!fixture_id) {
      return Response.json(
        { error: "fixture_id required" },
        { status: 400 }
      )
    }

    // 1. Fetch verified result from Sportmonks
    const raw = await fetchFixture(fixture_id)
    const result = extractResult(raw)

    // 2. Check if finished (status = 5 = finished)
    if (result.status !== 5) {
      return Response.json(
        { 
          error: `Fixture not finished yet (status: ${result.status})`,
          status_code: result.status
        },
        { status: 400 }
      )
    }

    // 3. Find associated bet
    const bet = getBetByFixture(fixture_id)

    if (!bet) {
      return Response.json(
        { error: "No bet found for this fixture" },
        { status: 404 }
      )
    }

    // 4. Attach result and mark settled
    bet.result = result.result as "home_win" | "away_win" | "draw"
    bet.status = "settled"

    // 5. Score the bet
    const scored = scoreBet(bet)
    bet.profit = scored.profit
    bet.clv = scored.clv
    bet.edge = scored.edge
    bet.won = scored.won

    // 6. Save updated bet
    saveBet(bet)

    // 7. Recalculate portfolio metrics
    const allBets = getAllBets()
    const metrics = calculatePortfolioMetrics(allBets)

    // 8. Check calibration
    const calibration = edgeCalibration(allBets)
    const health = calibrationHealth(allBets)

    return Response.json({
      status: "settled",
      bet: {
        id: bet.id,
        fixture_id: bet.fixture_id,
        prediction: bet.prediction,
        result: bet.result,
        odds_taken: bet.odds_taken,
        model_probability: bet.model_probability.toFixed(4),
        implied_probability: (1 / bet.odds_taken).toFixed(4),
        stake: bet.stake,
        profit: bet.profit,
        clv: bet.clv ? bet.clv.toFixed(4) : null,
        edge: bet.edge ? bet.edge.toFixed(4) : null,
        won: bet.won,
      },
      match: {
        home_team: result.home_team,
        away_team: result.away_team,
        score: `${result.home_goals}-${result.away_goals}`,
      },
      portfolio: {
        total_bets: metrics.totalBets,
        total_profit: metrics.totalProfit,
        total_stake: metrics.totalStake,
        roi: metrics.roi.toFixed(4),
        win_rate: metrics.winRate.toFixed(4),
        avg_edge: metrics.avgEdge.toFixed(4),
      },
      calibration: {
        health: health.healthy ? "✓ Healthy" : "⚠ Issues Detected",
        summary: health.summary,
        warnings: health.warnings,
        breakdown: calibration.map((c) => ({
          edge_bucket: c.bucket.label,
          bets_in_bucket: c.count,
          actual_win_rate: c.winRate.toFixed(4),
          expected_win_rate: c.expectedWinRate.toFixed(4),
          status: c.accuracy,
        })),
      },
    })
  } catch (error: any) {
    console.error("Settlement error:", error)
    return Response.json(
      { error: error.message || "Settlement failed" },
      { status: 500 }
    )
  }
}
