import { createClient } from "@supabase/supabase-js";
import { poissonModel, calculateValue } from "@/lib/poisson/model";

interface Prediction {
  [key: string]: any;
}

/**
 * Determine system state based on rolling CLV and beat rate
 */
async function getSystemState(supabase: any) {
  try {
    const { data: predictions, error } = await supabase
      .from("predictions")
      .select("*")
      .not("result", "is", null)
      .not("closing_odds", "is", null)
      .order("settled_at", { ascending: false })
      .limit(50);

    if (error || !predictions || predictions.length === 0) {
      // Default to AMBER for caution if no data
      return {
        state: "AMBER",
        stakeMultiplier: 0.6,
        message: "Insufficient data, stakes reduced to 60%",
      };
    }

    // Calculate rolling metrics (last 50)
    let totalClv = 0;
    let beatingMarketCount = 0;

    predictions.forEach((pred: Prediction) => {
      const clv = pred.closing_odds - pred.odds_taken;
      totalClv += clv;

      if (pred.closing_odds < pred.odds_taken) {
        beatingMarketCount++;
      }
    });

    const avgClv = totalClv / predictions.length;
    const beatRate = (beatingMarketCount / predictions.length) * 100;

    // System state logic
    if (avgClv > 0 && beatRate > 55) {
      return {
        state: "GREEN",
        stakeMultiplier: 1.0,
        message: "Edge confirmed",
      };
    } else if (avgClv >= -0.005 && beatRate >= 48 && beatRate <= 55) {
      return {
        state: "AMBER",
        stakeMultiplier: 0.6,
        message: "Uncertain, stakes at 60%",
      };
    } else {
      return {
        state: "RED",
        stakeMultiplier: 0,
        message: "Betting paused",
      };
    }
  } catch (err) {
    // Default to AMBER on error
    return {
      state: "AMBER",
      stakeMultiplier: 0.6,
      message: "Error checking state, stakes reduced",
    };
  }
}

/**
 * GET /api/generate
 * 
 * Generate live predictions from today's fixtures
 * Runs Poisson model, evaluates edge, inserts into Supabase
 * Respects system state (GREEN/AMBER/RED) for stake control
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );

    // Check system state (GREEN/AMBER/RED)
    const systemState = await getSystemState(supabase);

    // If RED, pause betting entirely
    if (systemState.stakeMultiplier === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Betting paused: ${systemState.message}`,
          systemState,
          stats: { inserted: 0, filtered: 0, reason: "RED state" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Mock fixtures for now (you'll replace with real API)
    const fixtures = [
      {
        id: "fixture_001",
        league: "EPL",
        homeTeam: {
          name: "Arsenal",
          attackStrength: 1.35,
          defenceStrength: 1.15,
        },
        awayTeam: {
          name: "Chelsea",
          attackStrength: 1.28,
          defenceStrength: 1.08,
        },
        homeOdds: 1.95,
        drawOdds: 3.5,
        awayOdds: 4.2,
        leagueAvgGoals: 1.4,
      },
      {
        id: "fixture_002",
        league: "EPL",
        homeTeam: {
          name: "Man City",
          attackStrength: 1.45,
          defenceStrength: 1.25,
        },
        awayTeam: {
          name: "Liverpool",
          attackStrength: 1.4,
          defenceStrength: 1.2,
        },
        homeOdds: 2.1,
        drawOdds: 3.2,
        awayOdds: 3.6,
        leagueAvgGoals: 1.4,
      },
    ];

    let inserted = 0;
    let filtered = 0;

    for (const fixture of fixtures) {
      // Run Poisson model
      const result = poissonModel({
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        leagueAvgGoals: fixture.leagueAvgGoals,
      });

      // Evaluate all three outcomes
      const homeValue = calculateValue(result.homeWinProb, fixture.homeOdds);
      const drawValue = calculateValue(result.drawProb, fixture.drawOdds);
      const awayValue = calculateValue(result.awayWinProb, fixture.awayOdds);

      // Find bets with positive EV and sufficient edge
      const edges = [
        {
          market: "match_winner",
          selection: "home",
          modelProb: result.homeWinProb,
          impliedProb: 1 / fixture.homeOdds,
          odds: fixture.homeOdds,
          ev: homeValue,
        },
        {
          market: "match_winner",
          selection: "draw",
          modelProb: result.drawProb,
          impliedProb: 1 / fixture.drawOdds,
          odds: fixture.drawOdds,
          ev: drawValue,
        },
        {
          market: "match_winner",
          selection: "away",
          modelProb: result.awayWinProb,
          impliedProb: 1 / fixture.awayOdds,
          odds: fixture.awayOdds,
          ev: awayValue,
        },
      ];

      for (const edge of edges) {
        const edge_value = edge.modelProb - edge.impliedProb;

        // Filter: EV > 5% and edge > 3%
        if (edge.ev < 0.05 || edge_value < 0.03) {
          filtered++;
          continue;
        }

        // Calculate stake (flat 1% of bankroll, adjusted by system state)
        const bankroll = Number(process.env.BANKROLL || "1000");
        let baseStake = bankroll * 0.01;
        const stake = baseStake * systemState.stakeMultiplier;

        // Insert into Supabase
        const { error } = await supabase.from("predictions").insert({
          match_id: fixture.id,
          league: fixture.league,
          home_team: fixture.homeTeam.name,
          away_team: fixture.awayTeam.name,
          market: edge.market,
          selection: edge.selection,
          model_probability: edge.modelProb,
          implied_probability: edge.impliedProb,
          edge: edge_value,
          ev: edge.ev,
          odds_taken: edge.odds,
          stake,
          result: "pending",
          placed_at: new Date(),
        });

        if (error) {
          console.error("Insert error:", error);
        } else {
          inserted++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated predictions: ${inserted} inserted, ${filtered} filtered`,
        stats: { inserted, filtered, stakeMultiplier: systemState.stakeMultiplier },
        systemState,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Generate error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
