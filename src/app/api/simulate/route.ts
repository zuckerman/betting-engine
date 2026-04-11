/**
 * /api/simulate
 * 
 * Generate 100 realistic simulated predictions with results + closing odds
 * Lets you see CLV metrics working without waiting for real data
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const leagues = ['EPL', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1'];
const markets = ['Moneyline', 'Over 2.5 Goals', 'BTTS', 'Over 1.5 Goals', 'Asian Handicap'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  try {
    const predictions: Record<string, any>[] = [];

    for (let i = 0; i < 100; i++) {
      // Generate realistic odds (1.5 to 3.5)
      const oddsTaken = 1.5 + Math.random() * 2;
      const impliedProbability = 1 / oddsTaken;

      // Model probability: slightly better than implied (simulate small edge)
      const modelProbability = Math.min(
        0.99,
        Math.max(0.01, impliedProbability + (Math.random() * 0.08 - 0.01))
      );

      // Simulate outcome based on implied probability
      const isWin = Math.random() < impliedProbability;
      const result = isWin ? 'WIN' : 'LOSS';

      // Closing odds: vary by ±10-15% (realistic market movement)
      const closingVariance = 0.85 + Math.random() * 0.3;
      const closingOdds = oddsTaken * closingVariance;

      // Calculate CLV
      const closingImplied = 1 / closingOdds;
      const clv = closingImplied - impliedProbability;

      // Calculate edge
      const edge = modelProbability - impliedProbability;

      predictions.push({
        league: randomElement(leagues),
        market: randomElement(markets),
        model_probability: parseFloat(modelProbability.toFixed(4)),
        implied_probability: parseFloat(impliedProbability.toFixed(4)),
        edge: parseFloat(edge.toFixed(4)),
        odds_taken: parseFloat(oddsTaken.toFixed(2)),
        closing_odds: parseFloat(closingOdds.toFixed(2)),
        result,
        clv: parseFloat(clv.toFixed(4)),
        placed_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        settled_at: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Insert into Prediction table (using camelCase to match Prisma schema)
    const { data, error } = await supabase
      .from('Prediction')
      .insert(predictions)
      .select();

    if (error) {
      console.error('Insert error:', error);
      // Try alternate table name
      const { data: data2, error: error2 } = await supabase
        .from('predictions')
        .insert(predictions)
        .select();

      if (error2) {
        return NextResponse.json({ error: error2.message }, { status: 500 });
      }
      
      const inserted = data2 || [];
      return formatResponse(inserted);
    }

    const inserted = data || [];
    return formatResponse(inserted);
  } catch (error) {
    console.error('Simulate error:', error);
    return NextResponse.json(
      { error: `Error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

function formatResponse(inserted: any[]) {
  // Calculate metrics
  const withCLV = inserted.filter((p: any) => p.clv !== null);
  const avgCLV = withCLV.length > 0
    ? withCLV.reduce((sum: number, p: any) => sum + p.clv, 0) / withCLV.length
    : 0;
  const positiveCLV = withCLV.filter((p: any) => p.clv > 0).length;
  const winRate = inserted.filter((p: any) => p.result === 'WIN').length / inserted.length;
  const avgModelProb = inserted.reduce((sum: number, p: any) => sum + (p.model_probability || p.modelProbability), 0) / inserted.length;
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
}

export const dynamic = 'force-dynamic';
