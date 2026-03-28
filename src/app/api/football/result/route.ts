import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/football/result
 * 
 * Update match result after it's played
 * 
 * Request:
 * {
 *   "match_id": "ARS-CHE-2026-03-28",
 *   "home_goals": 2,
 *   "away_goals": 1
 * }
 */
export async function POST(req: NextRequest) {
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

    // Update match in database
    const match = await prisma.match.update({
      where: { id: match_id },
      data: {
        homeGoals: home_goals,
        awayGoals: away_goals,
        result,
      },
    });

    return NextResponse.json({
      match_id,
      result,
      home_goals,
      away_goals,
      updated_at: match.updatedAt,
    });
  } catch (error: any) {
    console.error("Result error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update result" },
      { status: 500 }
    );
  }
}
