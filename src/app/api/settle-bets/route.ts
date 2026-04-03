/**
 * /api/settle-bets
 * 
 * Auto-settle predictions that have passed their kickoff time
 * Updates: closing_odds, clv, settled flag
 * 
 * Runs every 30 minutes via Vercel cron
 * Uses real CLV engine for validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { calculateCLV, validateOdds } from '@/lib/clv-engine';
import { getClosingOddsSafe } from '@/lib/betfair-odds-service';

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
      // Get closing odds (real Betfair or mock if not configured)
      // This is async but we'll handle it in the loop
      const entry = bet.odds_taken || 1.5;

      // Calculate CLV using real formula
      // CLV = (entry / closing) - 1
      // +5% = you got better value than market closed at
      // -5% = you got worse value than market closed at
      
      return {
        id: bet.id,
        entry_odds: entry,
        fixture_id: bet.fixture_id,
        selection_id: bet.match_id, // Note: field name mapping
      };
    });

    // Batch update with real odds
    let settledCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        // Get closing odds from Betfair or mock
        const closingOdds = await getClosingOddsSafe(
          update.fixture_id || 'mock',
          update.selection_id || 0,
          update.entry_odds
        );

        // Validate
        if (!validateOdds(closingOdds)) {
          console.warn(`Invalid closing odds for ${update.id}: ${closingOdds}`);
          errorCount++;
          continue;
        }

        // Calculate real CLV
        const clv = calculateCLV(update.entry_odds, closingOdds);

        // Update prediction
        const { error: updateError } = await supabase
          .from('predictions')
          .update({
            closing_odds: parseFloat(closingOdds.toFixed(2)),
            clv: parseFloat(clv.toFixed(4)),
            settled: true,
            settled_at: now,
          })
          .eq('id', update.id);

        if (!updateError) {
          settledCount++;
        } else {
          errorCount++;
          console.error(`Error settling prediction ${update.id}:`, updateError);
        }
      } catch (err) {
        errorCount++;
        console.error(`Error in settlement loop for ${update.id}:`, err);
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
