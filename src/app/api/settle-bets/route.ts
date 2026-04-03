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
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get unsettled bets that are past their kickoff time
    const now = new Date();
    const { data: unsettledBets, error: queryError } = await supabase
      .from('predictions')
      .select('*')
      .is('result', null)
      .lt('kickoff_at', now.toISOString())
      .limit(50); // Settle max 50 per run to avoid timeout

    if (queryError) {
      console.error('Query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!unsettledBets || unsettledBets.length === 0) {
      return NextResponse.json({ settled: 0, message: 'No bets to settle' });
    }

    // Settle each bet
    const updates = unsettledBets.map((bet) => {
      // For now: mock results (50/50 win/loss)
      // TODO: Replace with real odds/result API
      const result = Math.random() > 0.5 ? 'win' : 'loss';

      // Mock closing odds (±10% variance from opening)
      const variance = 0.9 + Math.random() * 0.2;
      const closingOdds = bet.odds_taken * variance;

      // CLV = difference in implied probability
      const closingImplied = 1 / closingOdds;
      const openingImplied = 1 / bet.odds_taken;
      const clv = closingImplied - openingImplied;

      return {
        id: bet.id,
        result,
        closing_odds: closingOdds,
        clv,
        settled_at: now.toISOString(),
      };
    });

    // Batch update
    let settledCount = 0;
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
        console.error(`Error settling bet ${update.id}:`, updateError);
      }
    }

    return NextResponse.json({
      settled: settledCount,
      total: updates.length,
      message: `Settled ${settledCount} / ${updates.length} bets`,
    });
  } catch (error) {
    console.error('Settle bets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
