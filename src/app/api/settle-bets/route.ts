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
import { 
  extractSharpPrices, 
  calculateSharpConsensus, 
  calculateSharpSpread,
  calculateSharpCLV 
} from '@/lib/sharp-clv-engine';
import { getLiveOdds } from '@/lib/odds-api';

// Simple in-memory cache (60 second TTL)
const oddsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

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

    // Batch update with sharp CLV from Odds API
    let settledCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        // Get sharp consensus from Odds API (with caching)
        let oddsData = null;
        const cacheKey = `odds-${update.fixture_id}`;
        const cached = oddsCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          oddsData = cached.data;
          console.log(`[CACHE HIT] ${cacheKey}`);
        } else {
          // Fetch from API
          oddsData = await getLiveOdds();
          oddsCache.set(cacheKey, { data: oddsData, timestamp: Date.now() });
          console.log(`[API FETCH] Got odds`);
        }

        if (!oddsData || oddsData.length === 0) {
          console.warn(`No odds data for ${update.id}, skipping`);
          errorCount++;
          continue;
        }

        // Extract sharp prices for this team
        const sharpPrices = extractSharpPrices(oddsData[0], update.home_team);
        
        if (sharpPrices.length === 0) {
          console.warn(`No sharp prices for ${update.home_team}, skipping`);
          errorCount++;
          continue;
        }

        // Calculate spread to validate market quality (<8%)
        const spread = calculateSharpSpread(sharpPrices.map(p => p.price));
        if (spread > 0.08) {
          console.warn(`Spread too wide (${(spread * 100).toFixed(1)}%) for ${update.id}, skipping`);
          errorCount++;
          continue;
        }

        // Calculate sharp CLV
        const clvResult = calculateSharpCLV({
          entryOdds: update.entry_odds,
          sharpPrices: sharpPrices.map(p => p.price),
        });

        if (!clvResult || !clvResult.isValid) {
          console.warn(`Invalid CLV for ${update.id}`);;
          errorCount++;
          continue;
        }

        // Update prediction with sharp CLV
        const { error: updateError } = await supabase
          .from('predictions')
          .update({
            closing_odds: parseFloat(clvResult.consensus.toFixed(2)),
            clv: parseFloat((clvResult.clv * 100).toFixed(2)),
            settled: true,
            settled_at: now,
            metadata: {
              sharp_consensus: clvResult.consensus,
              spread: (spread * 100).toFixed(2),
              book_count: sharpPrices.length,
            }
          })
          .eq('id', update.id);

        if (!updateError) {
          settledCount++;
          console.log(`[SETTLED] ${update.id}: CLV ${clvResult.clv > 0 ? '+' : ''}${(clvResult.clv * 100).toFixed(2)}%`);
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
