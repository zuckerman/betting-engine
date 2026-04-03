/**
 * Test Data Seed Script
 * 
 * Purpose: Load 20 realistic test predictions with results + closing odds
 * This lets you verify the entire CLV pipeline works BEFORE real data arrives
 * 
 * Run: npx ts-node scripts/seed-test-predictions.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Realistic test data
const testPredictions = [
  {
    league: "EPL",
    match: "Arsenal vs Liverpool",
    market: "Over 2.5 Goals",
    model_probability: 0.62,
    odds_taken: 1.95,
    result: "win" as const,
    closing_odds: 1.92,
  },
  {
    league: "EPL",
    match: "Man City vs Chelsea",
    market: "Moneyline",
    model_probability: 0.58,
    odds_taken: 1.88,
    result: "loss" as const,
    closing_odds: 1.85,
  },
  {
    league: "LaLiga",
    match: "Barcelona vs Real Madrid",
    market: "BTTS",
    model_probability: 0.71,
    odds_taken: 2.05,
    result: "win" as const,
    closing_odds: 2.08,
  },
  {
    league: "EPL",
    match: "Tottenham vs Man United",
    market: "Over 2.5 Goals",
    model_probability: 0.55,
    odds_taken: 1.80,
    result: "win" as const,
    closing_odds: 1.75,
  },
  {
    league: "Serie A",
    match: "Juventus vs AS Roma",
    market: "Moneyline",
    model_probability: 0.64,
    odds_taken: 2.10,
    result: "win" as const,
    closing_odds: 2.15,
  },
  {
    league: "Bundesliga",
    match: "Bayern Munich vs Dortmund",
    market: "Over 2.5 Goals",
    model_probability: 0.59,
    odds_taken: 1.92,
    result: "loss" as const,
    closing_odds: 1.89,
  },
  {
    league: "Ligue 1",
    match: "PSG vs Marseille",
    market: "BTTS",
    model_probability: 0.68,
    odds_taken: 1.98,
    result: "win" as const,
    closing_odds: 2.02,
  },
  {
    league: "EPL",
    match: "Newcastle vs Brighton",
    market: "Moneyline",
    model_probability: 0.61,
    odds_taken: 2.20,
    result: "win" as const,
    closing_odds: 2.25,
  },
  {
    league: "LaLiga",
    match: "Atletico Madrid vs Sevilla",
    market: "Over 2.5 Goals",
    model_probability: 0.52,
    odds_taken: 1.75,
    result: "loss" as const,
    closing_odds: 1.72,
  },
  {
    league: "Serie A",
    match: "Inter Milan vs AC Milan",
    market: "BTTS",
    model_probability: 0.73,
    odds_taken: 2.12,
    result: "win" as const,
    closing_odds: 2.18,
  },
  {
    league: "EPL",
    match: "Liverpool vs Everton",
    market: "Moneyline",
    model_probability: 0.67,
    odds_taken: 1.82,
    result: "win" as const,
    closing_odds: 1.85,
  },
  {
    league: "Bundesliga",
    match: "Borussia Leverkusen vs Hamburg",
    market: "Over 2.5 Goals",
    model_probability: 0.54,
    odds_taken: 1.88,
    result: "win" as const,
    closing_odds: 1.92,
  },
  {
    league: "Ligue 1",
    match: "Lyon vs Nice",
    market: "Moneyline",
    model_probability: 0.60,
    odds_taken: 2.05,
    result: "loss" as const,
    closing_odds: 2.02,
  },
  {
    league: "EPL",
    match: "Manchester United vs Aston Villa",
    market: "BTTS",
    model_probability: 0.59,
    odds_taken: 1.95,
    result: "loss" as const,
    closing_odds: 1.92,
  },
  {
    league: "LaLiga",
    match: "Valencia vs Granada",
    market: "Over 2.5 Goals",
    model_probability: 0.66,
    odds_taken: 2.10,
    result: "win" as const,
    closing_odds: 2.12,
  },
  {
    league: "Serie A",
    match: "Napoli vs Lazio",
    market: "Moneyline",
    model_probability: 0.62,
    odds_taken: 1.98,
    result: "win" as const,
    closing_odds: 2.00,
  },
  {
    league: "Bundesliga",
    match: "RB Leipzig vs Union Berlin",
    market: "BTTS",
    model_probability: 0.55,
    odds_taken: 1.82,
    result: "loss" as const,
    closing_odds: 1.80,
  },
  {
    league: "Ligue 1",
    match: "Monaco vs Lens",
    market: "Over 2.5 Goals",
    model_probability: 0.61,
    odds_taken: 2.08,
    result: "win" as const,
    closing_odds: 2.10,
  },
  {
    league: "EPL",
    match: "West Ham vs Fulham",
    market: "Moneyline",
    model_probability: 0.57,
    odds_taken: 1.90,
    result: "loss" as const,
    closing_odds: 1.88,
  },
  {
    league: "LaLiga",
    match: "Villarreal vs Betis",
    market: "BTTS",
    model_probability: 0.64,
    odds_taken: 2.00,
    result: "win" as const,
    closing_odds: 2.05,
  },
];

async function seedTestData() {
  console.log("🧪 Seeding test predictions...\n");

  const toInsert = testPredictions.map((pred) => {
    const implied = 1 / pred.odds_taken;
    const edge = pred.model_probability - implied;
    const clv = pred.closing_odds - pred.odds_taken;

    return {
      league: pred.league,
      match_description: pred.match,
      market: pred.market,
      model_probability: pred.model_probability,
      implied_probability: implied,
      edge: edge,
      odds_taken: pred.odds_taken,
      closing_odds: pred.closing_odds,
      result: pred.result,
      clv: clv,
      placed_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random last 7 days
      settled_at: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000), // Random last 3 days
    };
  });

  const { data, error } = await supabase
    .from("predictions")
    .insert(toInsert)
    .select();

  if (error) {
    console.error("❌ Error inserting data:", error);
    return;
  }

  console.log("✅ Successfully inserted", data?.length || 0, "test predictions\n");

  // Now run the metrics
  console.log("📊 Calculating metrics...\n");

  const { data: metrics } = await supabase
    .from("predictions")
    .select("*")
    .not("clv", "is", null);

  if (metrics && metrics.length > 0) {
    const avgCLV = metrics.reduce((sum, p) => sum + p.clv, 0) / metrics.length;
    const positiveCLV = metrics.filter((p) => p.clv > 0).length;
    const avgModelProb = metrics.reduce((sum, p) => sum + p.model_probability, 0) / metrics.length;
    const winRate = metrics.filter((p) => p.result === "win").length / metrics.length;
    const avgCalibrationError = avgModelProb - winRate;

    console.log("📈 METRICS:");
    console.log(`   Total bets: ${metrics.length}`);
    console.log(`   Avg CLV: ${(avgCLV * 100).toFixed(2)}%`);
    console.log(`   Bets beating line: ${positiveCLV} / ${metrics.length} (${((positiveCLV / metrics.length) * 100).toFixed(1)}%)`);
    console.log(`   Win rate: ${(winRate * 100).toFixed(1)}%`);
    console.log(`   Avg model prob: ${(avgModelProb * 100).toFixed(1)}%`);
    console.log(`   Calibration error: ${(avgCalibrationError * 100).toFixed(2)}%\n`);

    // Interpret
    if (avgCLV > 0.03) {
      console.log("🎯 CLV: ELITE (> +3%)");
    } else if (avgCLV > 0.01) {
      console.log("✅ CLV: REAL EDGE (> +1%)");
    } else if (avgCLV > 0) {
      console.log("⚠️  CLV: WEAK (0-1%)");
    } else {
      console.log("❌ CLV: MARKET BEATS YOU");
    }

    if (winRate > 0.55) {
      console.log("✅ Win rate: GOOD (> 55%)");
    } else if (winRate > 0.5) {
      console.log("⚠️  Win rate: NEUTRAL (50-55%)");
    } else {
      console.log("❌ Win rate: WORSE THAN 50/50");
    }

    if (Math.abs(avgCalibrationError) < 0.05) {
      console.log("✅ Calibration: WELL CALIBRATED (< 5% error)\n");
    } else if (Math.abs(avgCalibrationError) < 0.1) {
      console.log("⚠️  Calibration: SLIGHTLY OFF (5-10% error)\n");
    } else {
      console.log("❌ Calibration: OVERCONFIDENT (> 10% error)\n");
    }
  }

  console.log("✨ Test data seed complete!");
  console.log("\nNow run:");
  console.log("  npm run build");
  console.log("  Then visit /dashboard/validation to see metrics\n");
}

seedTestData().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
