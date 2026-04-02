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
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch pending predictions
    const { data: predictions, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("result", "pending")
      .order("placed_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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

    return new Response(
      JSON.stringify({
        success: true,
        count: signals.length,
        signals,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Live signals error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
