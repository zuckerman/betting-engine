import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );

    const { data, error } = await supabase.from("predictions").insert({
      match_id: "test_match_001",
      league: "EPL",
      market: "match_winner",
      selection: "home",
      model_probability: 0.58,
      implied_probability: 0.50,
      edge: 0.08,
      ev: 0.16,
      odds_taken: 2.0,
      stake: 10,
      result: "pending",
      placed_at: new Date(),
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Row inserted successfully", data },
      { status: 200 }
    );
  } catch (err) {
    console.error("Test insert error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
