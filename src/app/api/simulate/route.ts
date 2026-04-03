/**
 * /api/simulate
 * 
 * Generate 100 realistic simulated predictions with results + closing odds
 * Lets you see CLV metrics working without waiting for real data
 * 
 * Run once: POST /api/simulate
 * Then check /dashboard/validation for populated metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const leagues = ['EPL', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1'];
const markets = ['Moneyline', 'Over 2.5 Goals', 'BTTS', 'Over 1.5 Goals', 'Asian Handicap'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    const bets: Record<string, any>[] = [];

    for (let i = 0; i < 100; i++) {
      // Generate realistic odds (1.5 to 3.5)
      const odds_taken = 1.5 + Math.random() * 2;
      const opening_implied = 1 / odds_taken;

      // Model probability: slightly better than implied (simulate small edge)
      // Mean edge around +1% to +3%
      const model_probability = Math.min(
        0.99,
        Math.max(0.01, opening_implied + (Math.random() * 0.08 - 0.01))
      );

      // Simulate outcome based on implied probability (realistic)
      const actual_prob = opening_implied;
      const result = Math.random() < actual_prob ? 'loss' : 'win';

      // Closing odds: vary by ±10-15% (realistic market movement)
      const closingVariance = 0.85 + Math.random() * 0.3;
      const closing_odds = odds_taken * closingVariance;

      // Calculate CLV
      const closing_implied = 1 / closing_odds;
      const clv = closing_implied - opening_implied;

      // Calculate edge
      const edge = model_probability - opening_implied;

      // Create bet
      bets.push({
        league: randomElement(leagues),
        match_description: `Match ${i + 1}`,
        market: randomElement(markets),
        model_probability: parseFloat(model_probability.toFixed(4)),
        implied_probability: parseFloat(opening_implied.toFixed(4)),
        edge: parseFloat(edge.toFixed(4)),
        odds_taken: parseFloat(odds_taken.toFixed(2)),
        closing_odds: parseFloat(closing_odds.toFixed(2)),
        result,
        clv: parseFloat(clv.toFixed(4)),
        placed_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        settled_at: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
      });
    }

    // Insert batch
    const { data, error } = await supabase
      .from('predictions')
      .insert(bets)
      .select();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate metrics
    const inserted = data || [];
    const withCLV = inserted.filter((p: any) => p.clv !== null);
    const avgCLV = withCLV.length > 0
      ? withCLV.reduce((sum: number, p: any) => sum + p.clv, 0) / withCLV.length
      : 0;
    const positiveCLV = withCLV.filter((p: any) => p.clv > 0).length;
    const winRate = inserted.filter((p: any) => p.result === 'win').length / inserted.length;
    const avgModelProb = inserted.reduce((sum: number, p: any) => sum + p.model_probability, 0) / inserted.length;
    const calibrationError = avgModelProb - winRate;

    return NextResponse.json({
      success: true,
      inserted: inserted.length,
      metrics: {
        avg_clv: parseFloat((avgCLV * 100).toFixed(2)) + '%',
        bets_beating_line: `${positiveCLV} / ${withCLV.length}`,
        win_rate: parseFloat((winRate * 100).toFixed(1)) + '%',
        avg_model_probability: parseFloat((avgModelProb * 100).toFixed(1)) + '%',
        calibration_error: parseFloat((calibrationError * 100).toFixed(2)) + '%',
      },
      interpretation: {
        clv: avgCLV > 0.03 ? 'ELITE' : avgCLV > 0.01 ? 'REAL EDGE' : 'WEAK',
        win_rate: winRate > 0.55 ? 'GOOD' : winRate > 0.5 ? 'NEUTRAL' : 'POOR',
        calibration: Math.abs(calibrationError) < 0.05 ? 'WELL CALIBRATED' : 'OVERCONFIDENT',
      },
      next_step: 'Visit /dashboard/validation to see full metrics',
    });
  } catch (error) {
    console.error('Simulate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
