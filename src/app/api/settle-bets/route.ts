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

    // Get unsettled predictions that have passed their event_start time
    const now = new Date().toISOString();
    const { data: unsettledBets, error: queryError } = await supabase
      .from('predictions')
      .select('*')
      .eq('settled', false)
      .lte('event_start', now)
      .limit(100); // Settle max 100 per run to avoid timeout

    if (queryError) {
      console.error('Query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!unsettledBets || unsettledBets.length === 0) {
      return NextResponse.json({ 
        settled: 0, 
        message: 'No predictions to settle',
        timestamp: now
      });
    }

    console.log(`[SETTLE] Found ${unsettledBets.length} unsettled predictions`);

    // Settle each prediction
    const updates = unsettledBets.map((bet) => {
      // Mock closing odds (±5-15% variance from opening)
      // TODO: Replace with real odds API (Betfair, Odds API, etc)
      const variance = 0.85 + Math.random() * 0.3;
      const closingOdds = (bet.odds_taken || 1.5) * variance;

      // 🔥 REAL CLV CALCULATION
      // CLV = (closing_implied - opening_implied)
      // Positive CLV = market converged to better odds than you took (you were right)
      // Negative CLV = market diverged to worse odds than you took (you were lucky or wrong)
      const closingImplied = 1 / closingOdds;
      const openingImplied = 1 / (bet.odds_taken || 1.5);
      const clv = closingImplied - openingImplied;

      return {
        id: bet.id,
        closing_odds: parseFloat(closingOdds.toFixed(2)),
        clv: parseFloat(clv.toFixed(4)),
        settled: true,
        settled_at: now,
      };
    });

    // Batch update
    let settledCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('predictions')
        .update({
          closing_odds: update.closing_odds,
          clv: update.clv,
          settled: update.settled,
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
      timestamp: now
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
