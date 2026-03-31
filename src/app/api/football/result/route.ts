import { NextResponse } from "next/server";

/**
 * POST /api/football/result
 * Track actual result
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { match_id, home_goals, away_goals } = body;

    if (!match_id || home_goals === undefined || away_goals === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: match_id, home_goals, away_goals" },
        { status: 400 }
      );
    }

    // Determine result
    let result: string;
    if (home_goals > away_goals) {
      result = "home_win";
    } else if (home_goals < away_goals) {
      result = "away_win";
    } else {
      result = "draw";
    }

    // Update match in database (disabled - using stateless API)


    return NextResponse.json({
      match_id,
      result,
      home_goals,
      away_goals,
      updated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Result error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update result" },
      { status: 500 }
    );
  }
}
