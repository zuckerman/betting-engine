import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { poissonModel, calculateValue, PoissonInput } from "@/lib/poisson/model";

const prisma = new PrismaClient();

/**
 * POST /api/football/predict
 * 
 * Request:
 * {
 *   "match_id": "ARS-CHE-2026-03-28",
 *   "home_team": {
 *     "name": "Arsenal",
 *     "attack_strength": 1.2,
 *     "defence_strength": 0.9
 *   },
 *   "away_team": {
 *     "name": "Chelsea",
 *     "attack_strength": 1.1,
 *     "defence_strength": 0.95
 *   },
 *   "home_odds": 2.1,
 *   "draw_odds": 3.4,
 *   "away_odds": 3.2,
 *   "league_avg_goals": 1.4
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      match_id,
      home_team: homeTeamData,
      away_team: awayTeamData,
      home_odds: homeOdds,
      draw_odds: drawOdds,
      away_odds: awayOdds,
      league_avg_goals = 1.4,
    } = body;

    // Validate input
    if (!match_id || !homeTeamData || !awayTeamData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Run Poisson model
    const input: PoissonInput = {
      homeTeam: {
        name: homeTeamData.name,
        attackStrength: homeTeamData.attack_strength,
        defenceStrength: homeTeamData.defence_strength,
      },
      awayTeam: {
        name: awayTeamData.name,
        attackStrength: awayTeamData.attack_strength,
        defenceStrength: awayTeamData.defence_strength,
      },
      leagueAvgGoals: league_avg_goals,
    };

    const result = poissonModel(input);

    // Calculate value
    const homeValue = calculateValue(result.homeWinProb, homeOdds);
    const drawValue = calculateValue(result.drawProb, drawOdds);
    const awayValue = calculateValue(result.awayWinProb, awayOdds);

    // Determine predicted result
    let predictedResult: string;
    if (result.homeWinProb > result.drawProb && result.homeWinProb > result.awayWinProb) {
      predictedResult = "home_win";
    } else if (result.awayWinProb > result.drawProb) {
      predictedResult = "away_win";
    } else {
      predictedResult = "draw";
    }

    // Save to database
    const prediction = await prisma.prediction.create({
      data: {
        matchId: match_id,
        homeWinProb: result.homeWinProb,
        drawProb: result.drawProb,
        awayWinProb: result.awayWinProb,
        homeOdds,
        drawOdds,
        awayOdds,
        predictedResult,
      },
    });

    return NextResponse.json({
      prediction: {
        home_win: result.homeWinProb,
        draw: result.drawProb,
        away_win: result.awayWinProb,
      },
      expected_goals: {
        home: result.homeLambda,
        away: result.awayLambda,
      },
      value: {
        home: homeValue.toFixed(4),
        draw: drawValue.toFixed(4),
        away: awayValue.toFixed(4),
      },
      predicted_result: predictedResult,
      saved_at: prediction.createdAt,
    });
  } catch (error: any) {
    console.error("Prediction error:", error);
    return NextResponse.json(
      { error: error.message || "Prediction failed" },
      { status: 500 }
    );
  }
}
