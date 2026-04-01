import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Advanced analytics endpoint
 * POST /api/analytics/query
 * 
 * Provides institutional-grade metrics for analysis
 */

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await request.json()
    const { experimentId, query } = body

    if (!experimentId || !query) {
      return NextResponse.json(
        { error: 'experimentId and query required' },
        { status: 400 }
      )
    }

    // Whitelist allowed queries (prevent SQL injection)
    const allowedQueries = [
      'clv-health',
      'drawdown-status',
      'real-vs-shadow',
      'market-breakdown',
      'odds-analysis',
      'clv-trend',
      'win-loss-ratio'
    ]

    if (!allowedQueries.includes(query)) {
      return NextResponse.json(
        { error: 'Invalid query type' },
        { status: 400 }
      )
    }

    let result

    switch (query) {
      case 'clv-health':
        result = await getClvHealth(experimentId)
        break
      case 'drawdown-status':
        result = await getDrawdownStatus(experimentId)
        break
      case 'real-vs-shadow':
        result = await getRealVsShadow(experimentId)
        break
      case 'market-breakdown':
        result = await getMarketBreakdown(experimentId)
        break
      case 'odds-analysis':
        result = await getOddsAnalysis(experimentId)
        break
      case 'clv-trend':
        result = await getClvTrend(experimentId)
        break
      case 'win-loss-ratio':
        result = await getWinLossRatio(experimentId)
        break
      default:
        result = null
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('[ANALYTICS] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function getClvHealth(experimentId: string) {
  const { data: bets, error } = await supabase
    .from('bets')
    .select('clv')
    .eq('experimentId', experimentId)
    .eq('isShadow', false)
    .not('clv', 'is', null)

  if (error || !bets) return null

  const clvValues = bets.map(b => b.clv)
  const avgClv = clvValues.reduce((a, b) => a + b, 0) / clvValues.length
  const positive = clvValues.filter(c => c > 0).length
  const positiveRate = positive / clvValues.length

  const systemHealthy = avgClv >= 0 && positiveRate >= 0.48

  return {
    avgClv: Number(avgClv.toFixed(4)),
    positiveRate: Number((positiveRate * 100).toFixed(1)),
    sampleSize: clvValues.length,
    systemHealthy,
    status: systemHealthy ? 'HEALTHY' : 'AT RISK'
  }
}

async function getDrawdownStatus(experimentId: string) {
  const { data: bankroll, error } = await supabase
    .from('bankroll')
    .select('*')
    .eq('experimentId', experimentId)
    .single()

  if (error || !bankroll) return null

  const drawdown = (bankroll.peakBalance - bankroll.currentBalance) / bankroll.peakBalance
  const roi = (bankroll.currentBalance - bankroll.startingBalance) / bankroll.startingBalance

  let riskLevel = 'LOW'
  let action = 'NORMAL STAKING'

  if (drawdown > 0.3) {
    riskLevel = 'CRITICAL'
    action = 'STOP ALL BETS'
  } else if (drawdown > 0.2) {
    riskLevel = 'HIGH'
    action = 'QUARTER STAKES'
  } else if (drawdown > 0.1) {
    riskLevel = 'MEDIUM'
    action = 'HALVE STAKES'
  }

  return {
    currentBalance: Number(bankroll.currentBalance.toFixed(2)),
    peakBalance: Number(bankroll.peakBalance.toFixed(2)),
    startingBalance: bankroll.startingBalance,
    drawdownPct: Number((drawdown * 100).toFixed(1)),
    roiPct: Number((roi * 100).toFixed(1)),
    riskLevel,
    action
  }
}

async function getRealVsShadow(experimentId: string) {
  const { data: bets, error } = await supabase
    .from('bets')
    .select('isShadow, clv')
    .eq('experimentId', experimentId)
    .not('clv', 'is', null)

  if (error || !bets) return null

  const real = bets.filter(b => !b.isShadow)
  const shadow = bets.filter(b => b.isShadow)

  const realAvg = real.length > 0 ? real.reduce((a, b) => a + b.clv, 0) / real.length : 0
  const shadowAvg = shadow.length > 0 ? shadow.reduce((a, b) => a + b.clv, 0) / shadow.length : 0

  const filterQuality = shadowAvg < realAvg ? 'GOOD' : 'BAD'

  return {
    realBets: {
      count: real.length,
      avgClv: Number(realAvg.toFixed(4)),
      positiveRate: real.length > 0 ? (real.filter(b => b.clv > 0).length / real.length * 100).toFixed(1) : 0
    },
    shadowBets: {
      count: shadow.length,
      avgClv: Number(shadowAvg.toFixed(4)),
      positiveRate: shadow.length > 0 ? (shadow.filter(b => b.clv > 0).length / shadow.length * 100).toFixed(1) : 0
    },
    filterQuality,
    interpretation: filterQuality === 'GOOD' 
      ? 'Filters are adding edge ✅' 
      : 'Filters are removing edge ❌'
  }
}

async function getMarketBreakdown(experimentId: string) {
  const { data: bets, error } = await supabase
    .from('bets')
    .select('market, clv, result')
    .eq('experimentId', experimentId)
    .eq('isShadow', false)
    .not('clv', 'is', null)

  if (error || !bets) return null

  const markets: Record<string, any> = {}

  bets.forEach(bet => {
    if (!markets[bet.market]) {
      markets[bet.market] = { clvs: [], count: 0 }
    }
    markets[bet.market].clvs.push(bet.clv)
    markets[bet.market].count += 1
  })

  const breakdown = Object.entries(markets).map(([market, data]: [string, any]) => ({
    market,
    count: data.count,
    avgClv: Number((data.clvs.reduce((a: number, b: number) => a + b, 0) / data.count).toFixed(4)),
    positiveRate: Number(((data.clvs.filter((c: number) => c > 0).length / data.count) * 100).toFixed(1))
  }))

  return breakdown.sort((a, b) => b.count - a.count)
}

async function getOddsAnalysis(experimentId: string) {
  const { data: bets, error } = await supabase
    .from('bets')
    .select('oddsTaken, clv')
    .eq('experimentId', experimentId)
    .eq('isShadow', false)
    .not('clv', 'is', null)

  if (error || !bets) return null

  const ranges = {
    'short (< 1.5)': bets.filter(b => b.oddsTaken < 1.5),
    'mid (1.5-2.0)': bets.filter(b => b.oddsTaken >= 1.5 && b.oddsTaken < 2.0),
    'long (2.0-3.0)': bets.filter(b => b.oddsTaken >= 2.0 && b.oddsTaken < 3.0),
    'very_long (> 3.0)': bets.filter(b => b.oddsTaken >= 3.0)
  }

  const analysis = Object.entries(ranges).map(([range, items]: [string, any]) => ({
    range,
    count: items.length,
    avgClv: items.length > 0 ? Number((items.reduce((a: number, b: any) => a + b.clv, 0) / items.length).toFixed(4)) : 0,
    positiveRate: items.length > 0 ? Number(((items.filter((b: any) => b.clv > 0).length / items.length) * 100).toFixed(1)) : 0
  }))

  return analysis
}

async function getClvTrend(experimentId: string) {
  const { data: bets, error } = await supabase
    .from('bets')
    .select('placedAt, clv')
    .eq('experimentId', experimentId)
    .eq('isShadow', false)
    .not('clv', 'is', null)
    .order('placedAt', { ascending: true })

  if (error || !bets || bets.length < 10) return null

  const days: Record<string, any> = {}

  bets.forEach(bet => {
    const date = new Date(bet.placedAt).toISOString().split('T')[0]
    if (!days[date]) {
      days[date] = []
    }
    days[date].push(bet.clv)
  })

  const trend = Object.entries(days).map(([date, clvs]: [string, any]) => ({
    date,
    count: clvs.length,
    avgClv: Number((clvs.reduce((a: number, b: number) => a + b, 0) / clvs.length).toFixed(4)),
    cumulativeAvg: Number((bets
      .filter(b => new Date(b.placedAt).toISOString().split('T')[0] <= date)
      .reduce((a: number, b: any) => a + b.clv, 0) / bets.filter(b => new Date(b.placedAt).toISOString().split('T')[0] <= date).length).toFixed(4))
  }))

  return trend
}

async function getWinLossRatio(experimentId: string) {
  const { data: bets, error } = await supabase
    .from('bets')
    .select('result')
    .eq('experimentId', experimentId)
    .eq('isShadow', false)
    .not('result', 'is', null)

  if (error || !bets) return null

  const wins = bets.filter(b => b.result === 'WIN').length
  const losses = bets.filter(b => b.result === 'LOSS').length
  const voids = bets.filter(b => b.result === 'VOID').length

  const winRate = bets.length > 0 ? (wins / bets.length * 100).toFixed(1) : 0

  return {
    wins,
    losses,
    voids,
    total: bets.length,
    winRate: Number(winRate),
    ratio: losses > 0 ? Number((wins / losses).toFixed(2)) : wins > 0 ? 999 : 0
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST with query parameter',
    allowedQueries: [
      'clv-health',
      'drawdown-status',
      'real-vs-shadow',
      'market-breakdown',
      'odds-analysis',
      'clv-trend',
      'win-loss-ratio'
    ]
  })
}
