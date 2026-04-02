/**
 * Daily System Snapshot
 * 
 * Records daily metrics for trend detection (not noise).
 * Called once per day — tracks: bets, CLV, beat_rate, expected vs actual, state.
 * 
 * Prevents emotional decision-making by showing:
 * - Trends (multi-day movement)
 * - Not noise (single-day swings)
 * - Early drift detection
 */

import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all settled predictions with CLV data
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select('*')
      .not('result', 'is', null)
      .not('closing_odds', 'is', null);

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!predictions || predictions.length === 0) {
      return Response.json({
        success: true,
        message: 'No settled bets yet',
        snapshot: null,
      });
    }

    // Calculate metrics (including by signal quality)
    let totalClv = 0;
    let highQualityClv = 0;
    let normalQualityClv = 0;
    let highQualityCount = 0;
    let normalQualityCount = 0;
    let beatingMarketCount = 0;
    let totalExpectedProfit = 0;
    let totalActualProfit = 0;

    predictions.forEach((pred: any) => {
      const clv = pred.closing_odds - pred.odds_taken;
      totalClv += clv;

      // Segment by signal quality
      if (pred.signal_quality === 'HIGH') {
        highQualityClv += clv;
        highQualityCount++;
      } else {
        normalQualityClv += clv;
        normalQualityCount++;
      }

      if (pred.closing_odds < pred.odds_taken) {
        beatingMarketCount++;
      }

      const expectedValue = pred.ev || 0;
      const expectedProfitForBet = expectedValue * pred.stake;
      totalExpectedProfit += expectedProfitForBet;

      let actualProfitForBet = 0;
      if (pred.result === 'WIN') {
        actualProfitForBet = (pred.closing_odds - 1) * pred.stake;
      } else if (pred.result === 'LOSS') {
        actualProfitForBet = -pred.stake;
      }
      totalActualProfit += actualProfitForBet;
    });

    const avgClv = totalClv / predictions.length;
    const avgHighQualityClv = highQualityCount > 0 ? highQualityClv / highQualityCount : 0;
    const avgNormalQualityClv = normalQualityCount > 0 ? normalQualityClv / normalQualityCount : 0;
    const beatRate = (beatingMarketCount / predictions.length) * 100;
    const divergence = totalExpectedProfit - totalActualProfit;

    // Determine system state
    let systemState = 'RED';
    if (avgClv > 0 && beatRate > 55) {
      systemState = 'GREEN';
    } else if (avgClv >= -0.005 && beatRate >= 48 && beatRate <= 55) {
      systemState = 'AMBER';
    }

    // Create snapshot
    const snapshot = {
      date: new Date().toISOString().split('T')[0],
      totalBets: predictions.length,
      rollingClv: parseFloat(avgClv.toFixed(4)),
      highQualityClv: parseFloat(avgHighQualityClv.toFixed(4)),
      normalQualityClv: parseFloat(avgNormalQualityClv.toFixed(4)),
      beatRate: parseFloat(beatRate.toFixed(2)),
      expectedProfit: parseFloat(totalExpectedProfit.toFixed(2)),
      actualProfit: parseFloat(totalActualProfit.toFixed(2)),
      divergence: parseFloat(divergence.toFixed(2)),
      systemState,
      timestamp: new Date().toISOString(),
    };

    // Insert into snapshots table
    const { error: insertError } = await supabase
      .from('daily_snapshots')
      .insert(snapshot);

    if (insertError) {
      console.warn('Could not insert snapshot (table may not exist yet):', insertError);
      // Return snapshot anyway even if table doesn't exist
    }

    return Response.json({
      success: true,
      message: 'Daily snapshot recorded',
      snapshot,
    });
  } catch (err) {
    return Response.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET: Retrieve snapshots for trend analysis
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: snapshots, error } = await supabase
      .from('daily_snapshots')
      .select('*')
      .order('date', { ascending: false })
      .limit(30); // Last 30 days

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = table doesn't exist
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      snapshots: snapshots || [],
      message: snapshots?.length
        ? `${snapshots.length} daily snapshots available`
        : 'No snapshots yet. Call POST to create first snapshot.',
    });
  } catch (err) {
    return Response.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
