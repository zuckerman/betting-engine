import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  try {
    // Fetch all predictions
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select('*')
      .order('placed_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const data = predictions || [];
    
    if (data.length === 0) {
      return NextResponse.json({
        total: 0,
        avgCLV: 0,
        positiveCLVPercent: 0,
        roi: 0,
        winRate: 0,
        leagueStats: [],
        marketStats: [],
        calibrationError: 0,
        message: 'No predictions yet'
      });
    }

    // Calculate metrics
    const withCLV = data.filter((p: any) => p.clv !== null && p.clv !== undefined);
    const avgCLV = withCLV.length > 0
      ? withCLV.reduce((sum: number, p: any) => sum + (p.clv || 0), 0) / withCLV.length
      : 0;
    
    const positiveCLV = withCLV.filter((p: any) => (p.clv || 0) > 0).length;
    const positiveCLVPercent = withCLV.length > 0 ? (positiveCLV / withCLV.length) * 100 : 0;
    
    const wins = data.filter((p: any) => p.result === 'WIN').length;
    const winRate = data.length > 0 ? (wins / data.length) * 100 : 0;
    
    const avgModelProb = data.reduce((sum: number, p: any) => sum + (p.modelProbability || 0), 0) / data.length;
    const calibrationError = avgModelProb - (winRate / 100);
    
    // ROI calculation
    let roi = 0;
    for (const pred of data) {
      const oddsTaken = pred.oddsTaken || 1;
      if (pred.result === 'WIN') {
        roi += (oddsTaken - 1);
      } else if (pred.result === 'LOSS') {
        roi -= 1;
      }
    }
    roi = data.length > 0 ? (roi / data.length) * 100 : 0;

    // By league
    const byLeague: Record<string, any[]> = {};
    data.forEach((p: any) => {
      const league = p.league || 'Unknown';
      if (!byLeague[league]) byLeague[league] = [];
      byLeague[league].push(p);
    });

    const leagueStats = Object.entries(byLeague).map(([league, bets]) => {
      const leagueWithCLV = bets.filter((b: any) => b.clv !== null && b.clv !== undefined);
      const leagueAvgCLV = leagueWithCLV.length > 0
        ? leagueWithCLV.reduce((sum: number, b: any) => sum + (b.clv || 0), 0) / leagueWithCLV.length
        : 0;
      const leagueWins = bets.filter((b: any) => b.result === 'WIN').length;
      const leagueHitRate = bets.length > 0 ? (leagueWins / bets.length) * 100 : 0;
      
      let leagueROI = 0;
      for (const bet of bets) {
        if (bet.result === 'WIN') {
          leagueROI += (bet.oddsTaken || 1) - 1;
        } else if (bet.result === 'LOSS') {
          leagueROI -= 1;
        }
      }
      leagueROI = bets.length > 0 ? (leagueROI / bets.length) * 100 : 0;

      return {
        league,
        count: bets.length,
        avgCLV: parseFloat((leagueAvgCLV * 100).toFixed(2)),
        hitRate: parseFloat(leagueHitRate.toFixed(1)),
        roi: parseFloat(leagueROI.toFixed(2))
      };
    });

    // By market
    const byMarket: Record<string, any[]> = {};
    data.forEach((p: any) => {
      const market = p.market || 'Unknown';
      if (!byMarket[market]) byMarket[market] = [];
      byMarket[market].push(p);
    });

    const marketStats = Object.entries(byMarket).map(([market, bets]) => {
      const marketWithCLV = bets.filter((b: any) => b.clv !== null && b.clv !== undefined);
      const marketAvgCLV = marketWithCLV.length > 0
        ? marketWithCLV.reduce((sum: number, b: any) => sum + (b.clv || 0), 0) / marketWithCLV.length
        : 0;
      const marketWins = bets.filter((b: any) => b.result === 'WIN').length;
      const marketHitRate = bets.length > 0 ? (marketWins / bets.length) * 100 : 0;
      
      let marketROI = 0;
      for (const bet of bets) {
        if (bet.result === 'WIN') {
          marketROI += (bet.oddsTaken || 1) - 1;
        } else if (bet.result === 'LOSS') {
          marketROI -= 1;
        }
      }
      marketROI = bets.length > 0 ? (marketROI / bets.length) * 100 : 0;

      return {
        market,
        count: bets.length,
        avgCLV: parseFloat((marketAvgCLV * 100).toFixed(2)),
        hitRate: parseFloat(marketHitRate.toFixed(1)),
        roi: parseFloat(marketROI.toFixed(2))
      };
    });

    // Red flags
    const redFlags = {
      negativeCLV: avgCLV < 0,
      lowHitRate: winRate < 50,
      smallSample: data.length < 30,
      negativeROI: roi < 0
    };

    return NextResponse.json({
      total: data.length,
      avgCLV: parseFloat((avgCLV * 100).toFixed(2)),
      positiveCLVPercent: parseFloat(positiveCLVPercent.toFixed(1)),
      roi: parseFloat(roi.toFixed(2)),
      winRate: parseFloat(winRate.toFixed(1)),
      calibrationError: parseFloat((calibrationError * 100).toFixed(2)),
      leagueStats,
      marketStats,
      redFlags,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: `Error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
