/**
 * /api/settle-bets
 * 
 * Auto-settle predictions that have passed their kickoff time
 * Updates: result, closing_odds, clv, settled_at
 * 
 * Runs every 30 minutes via Vercel cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  // Verify cron secret (optional for testing locally)
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get unsettled predictions with odds_taken (not kickoff time yet - for now settle all recent ones)
    const now = new Date();
    const { data: unsettledBets, error: queryError } = await supabase
      .from('predictions')
      .select('*')
      .is('settled_at', null)
      .gt('placed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h
      .limit(100); // Settle max 100 per run to avoid timeout

    if (queryError) {
      console.error('Query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!unsettledBets || unsettledBets.length === 0) {
      return NextResponse.json({ 
        settled: 0, 
        message: 'No predictions to settle',
        timestamp: now.toISOString()
      });
    }

    console.log(`[SETTLE] Found ${unsettledBets.length} unsettled predictions`);

    // Settle each prediction
    const updates = unsettledBets.map((bet) => {
      // For now: mock results (50/50 win/loss based on probability)
      // TODO: Replace with real odds/result API
      const isWin = Math.random() < (bet.model_probability || 0.5);
      const result = isWin ? 'WIN' : 'LOSS';

      // Mock closing odds (±5-15% variance from opening)
      // Real implementation: fetch from odds API
      const variance = 0.85 + Math.random() * 0.3;
      const closingOdds = (bet.odds_taken || 1.5) * variance;

      // CLV = (closing_implied - opening_implied)
      // Positive CLV = you beat the market at closing price
      const closingImplied = 1 / closingOdds;
      const openingImplied = 1 / (bet.odds_taken || 1.5);
      const clv = closingImplied - openingImplied;

      return {
        id: bet.id,
        result,
        closing_odds: parseFloat(closingOdds.toFixed(2)),
        clv: parseFloat(clv.toFixed(4)),
        settled_at: now.toISOString(),
      };
    });

    // Batch update
    let settledCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('predictions')
        .update({
          result: update.result,
          closing_odds: update.closing_odds,
          clv: update.clv,
          settled_at: update.settled_at,
        })
        .eq('id', update.id);

      if (!updateError) {
        settledCount++;
      } else {
        errorCount++;
        console.error(`Error settling prediction ${update.id}:`, updateError);
      }
    }

    console.log(`[SETTLE] Complete: ${settledCount} settled, ${errorCount} errors`);

    return NextResponse.json({
      settled: settledCount,
      failed: errorCount,
      total: updates.length,
      message: `Settled ${settledCount} / ${updates.length} predictions`,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Settle bets error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
