/**
 * CLV Tracking Endpoint (Decision Engine)
 * 
 * Calculates Closing Line Value metrics:
 * - Rolling CLV (last 50 bets) - what matters NOW
 * - Beat rate vs market (% beating closing line)
 * - Expected vs actual profit comparison
 * - Segmentation by league, odds range, market type
 * - System state (GREEN/AMBER/RED) for stake control
 */

import { createClient } from '@supabase/supabase-js';

interface Prediction {
  [key: string]: any;
}

function calculateOddsRange(odds: number): string {
  if (odds >= 1.5 && odds < 2.0) return '1.5-2.0';
  if (odds >= 2.0 && odds < 3.0) return '2.0-3.0';
  if (odds >= 3.0) return '3.0+';
  return 'under-1.5';
}

function calculateMetrics(predictions: Prediction[]) {
  let totalClv = 0;
  let beatingMarketCount = 0;
  let totalExpectedProfit = 0;
  let totalActualProfit = 0;

  predictions.forEach((pred: Prediction) => {
    const clv = pred.closing_odds - pred.odds_taken;
    totalClv += clv;

    // Count bets beating closing line
    if (pred.closing_odds < pred.odds_taken) {
      beatingMarketCount++;
    }

    // Calculate expected vs actual profit
    const expectedValue = pred.ev || 0;
    const expectedProfitForBet = expectedValue * pred.stake;
    totalExpectedProfit += expectedProfitForBet;

    // Calculate actual profit
    let actualProfitForBet = 0;
    if (pred.result === 'WIN') {
      actualProfitForBet = (pred.closing_odds - 1) * pred.stake;
    } else if (pred.result === 'LOSS') {
      actualProfitForBet = -pred.stake;
    }
    totalActualProfit += actualProfitForBet;
  });

  const avgClv = predictions.length > 0 ? totalClv / predictions.length : 0;
  const beatingMarketPct = predictions.length > 0 ? (beatingMarketCount / predictions.length) * 100 : 0;
  const divergence = totalExpectedProfit - totalActualProfit;

  return {
    count: predictions.length,
    avgClv: parseFloat(avgClv.toFixed(4)),
    beatingMarketPct: parseFloat(beatingMarketPct.toFixed(2)),
    expectedProfit: parseFloat(totalExpectedProfit.toFixed(2)),
    actualProfit: parseFloat(totalActualProfit.toFixed(2)),
    divergence: parseFloat(divergence.toFixed(2)),
  };
}

function determineSystemState(avgClv: number, beatRate: number) {
  if (avgClv > 0 && beatRate > 55) {
    return {
      state: 'GREEN',
      stakeMultiplier: 1.0,
      message: '✅ Edge confirmed: beat market + positive CLV',
    };
  } else if (avgClv >= -0.005 && beatRate >= 48 && beatRate <= 55) {
    return {
      state: 'AMBER',
      stakeMultiplier: 0.6,
      message: '⚠️ Uncertain: stakes reduced to 60%',
    };
  } else {
    return {
      state: 'RED',
      stakeMultiplier: 0,
      message: '🛑 Edge not present: betting paused',
    };
  }
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all settled predictions with CLV data
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select('*')
      .not('result', 'is', null) // Only settled bets
      .not('closing_odds', 'is', null) // Only bets with closing odds recorded
      .order('settled_at', { ascending: false });

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!predictions || predictions.length === 0) {
      return Response.json({
        success: true,
        message: 'No settled bets with closing odds yet',
        allTime: {
          totalBets: 0,
          avgClv: 0,
          beatingMarketPct: 0,
        },
        rolling50: {
          totalBets: 0,
          avgClv: 0,
          beatingMarketPct: 0,
        },
        systemState: determineSystemState(0, 0),
      });
    }

    // Calculate all-time metrics
    const allTimeMetrics = calculateMetrics(predictions);

    // Calculate rolling (last 50) metrics
    const last50 = predictions.slice(0, 50);
    const rolling50Metrics = calculateMetrics(last50);

    // Segment by league
    const byLeague: { [key: string]: any } = {};
    predictions.forEach((pred: Prediction) => {
      const league = pred.league || 'unknown';
      if (!byLeague[league]) {
        byLeague[league] = [];
      }
      byLeague[league].push(pred);
    });

    const leagueMetrics: { [key: string]: any } = {};
    Object.entries(byLeague).forEach(([league, preds]: [string, any]) => {
      leagueMetrics[league] = calculateMetrics(preds);
    });

    // Segment by odds range
    const byOddsRange: { [key: string]: any } = {};
    predictions.forEach((pred: Prediction) => {
      const range = calculateOddsRange(pred.odds_taken);
      if (!byOddsRange[range]) {
        byOddsRange[range] = [];
      }
      byOddsRange[range].push(pred);
    });

    const oddsRangeMetrics: { [key: string]: any } = {};
    Object.entries(byOddsRange).forEach(([range, preds]: [string, any]) => {
      oddsRangeMetrics[range] = calculateMetrics(preds);
    });

    // Segment by signal quality (HIGH vs NORMAL)
    const bySignalQuality: { [key: string]: any } = {};
    predictions.forEach((pred: Prediction) => {
      const quality = pred.signal_quality || 'NORMAL';
      if (!bySignalQuality[quality]) {
        bySignalQuality[quality] = [];
      }
      bySignalQuality[quality].push(pred);
    });

    const signalQualityMetrics: { [key: string]: any } = {};
    Object.entries(bySignalQuality).forEach(([quality, preds]: [string, any]) => {
      signalQualityMetrics[quality] = calculateMetrics(preds);
    });

    // Determine system state based on rolling CLV
    const systemState = determineSystemState(
      rolling50Metrics.avgClv,
      rolling50Metrics.beatingMarketPct
    );

    return Response.json({
      success: true,
      allTime: allTimeMetrics,
      rolling50: rolling50Metrics,
      systemState,
      segmentation: {
        byLeague: leagueMetrics,
        byOddsRange: oddsRangeMetrics,
        bySignalQuality: signalQualityMetrics,
      },
      benchmark: {
        targetBeatingMarket: 55,
        targetAvgClv: 0.01,
        divergenceTolerance: 5, // Expected vs actual should be within this
      },
    });
  } catch (err) {
    return Response.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
