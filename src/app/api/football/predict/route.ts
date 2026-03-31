import { NextResponse } from "next/server";
import { poissonModel, calculateValue } from "@/lib/poisson/model";

/**
 * POST /api/football/predict
 * 
 * Poisson model prediction (mock - database disabled)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      home_team: homeTeamData,
      away_team: awayTeamData,
      home_odds: homeOdds,
      draw_odds: drawOdds,
      away_odds: awayOdds,
      league_avg_goals = 1.4,
    } = body;

    // Validate input
    if (!homeTeamData || !awayTeamData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Run Poisson model
    const result = poissonModel({
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
    });

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
      saved_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Prediction error:", error);
    return NextResponse.json(
      { error: error.message || "Prediction failed" },
      { status: 500 }
    );
  }
}
