import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/live-signals
 * 
 * Read live predictions from Supabase
 * Displays: edge, stake, odds, market
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );

    // Fetch pending predictions
    const { data: predictions, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("result", "pending")
      .order("placed_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Transform for dashboard
    const signals = predictions.map((p: any) => ({
      id: p.id,
      matchId: p.match_id,
      league: p.league,
      homeTeam: p.home_team,
      awayTeam: p.away_team,
      market: p.market,
      selection: p.selection,
      odds: p.odds_taken,
      edge: p.edge,
      ev: p.ev,
      stake: p.stake,
      modelProb: p.model_probability,
      impliedProb: p.implied_probability,
      status: p.result,
      placedAt: p.placed_at,
    }));

    return NextResponse.json(
      {
        success: true,
        count: signals.length,
        signals,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Live signals error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
