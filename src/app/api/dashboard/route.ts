import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Dashboard endpoint - returns all key metrics
 * GET /api/dashboard?experimentId=xxx
 */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const experimentId = searchParams.get('experimentId')

    if (!experimentId) {
      return NextResponse.json(
        { error: 'experimentId required' },
        { status: 400 }
      )
    }

    // Get experiment
    const { data: experiment } = await supabase
      .from('experiments')
      .select('*')
      .eq('id', experimentId)
      .single()

    if (!experiment) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      )
    }

    // Get bankroll
    const { data: bankroll } = await supabase
      .from('bankroll')
      .select('*')
      .eq('experimentId', experimentId)
      .single()

    // Get bets
    const { data: bets } = await supabase
      .from('bets')
      .select('*')
      .eq('experimentId', experimentId)
      .eq('isShadow', false)

    if (!bets) {
      return NextResponse.json({
        experiment,
        bankroll,
        metrics: {
          totalBets: 0,
          avgClv: 0,
          positiveClvRate: 0,
          drawdown: 0,
          betsPerDay: 0,
          realVsShadow: { real: 0, shadow: 0 }
        }
      })
    }

    // Calculate metrics
    const validBets = bets.filter(b => b.clv !== null && b.result !== null)
    const clvValues = validBets.map(b => b.clv)
    const avgClv = clvValues.length > 0 ? clvValues.reduce((a, b) => a + b, 0) / clvValues.length : 0
    const positiveClvCount = clvValues.filter(c => c > 0).length
    const positiveClvRate = clvValues.length > 0 ? positiveClvCount / clvValues.length : 0

    const drawdown = bankroll
      ? (bankroll.peakBalance - bankroll.currentBalance) / bankroll.peakBalance
      : 0

    // Real vs shadow
    const { data: shadowBets } = await supabase
      .from('bets')
      .select('*')
      .eq('experimentId', experimentId)
      .eq('isShadow', true)

    // Calculate real vs shadow CLV
    const realClvValues = validBets.filter(b => !b.isShadow).map(b => b.clv)
    const shadowClvValues = shadowBets?.filter(b => b.clv !== null && b.result !== null).map(b => b.clv) || []
    const realClv = realClvValues.length > 0 ? realClvValues.reduce((a, b) => a + b, 0) / realClvValues.length : 0
    const shadowClv = shadowClvValues.length > 0 ? shadowClvValues.reduce((a, b) => a + b, 0) / shadowClvValues.length : 0

    // Get balance history (last 30 days, grouped by date)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: balanceHistory } = await supabase
      .from('bets')
      .select('placedAt, stake, result, clv', { count: 'exact' })
      .eq('experimentId', experimentId)
      .gte('placedAt', thirtyDaysAgo.toISOString())
      .order('placedAt', { ascending: true })

    // Build balance curve (cumulative)
    let runningBalance = bankroll?.startingBalance || 1000
    const balanceCurve = balanceHistory?.reduce((acc: any[], bet: any) => {
      if (bet.result === 'WIN') {
        runningBalance += bet.stake
      } else if (bet.result === 'LOSS') {
        runningBalance -= bet.stake
      }
      const date = new Date(bet.placedAt).toLocaleDateString()
      return acc.length === 0 || acc[acc.length - 1].date !== date
        ? [...acc, { date, balance: runningBalance }]
        : acc
    }, []) || []

    // Get CLV history (last 30 days)
    const { data: clvHistory } = await supabase
      .from('bets')
      .select('placedAt, clv')
      .eq('experimentId', experimentId)
      .eq('isShadow', false)
      .not('clv', 'is', null)
      .gte('placedAt', thirtyDaysAgo.toISOString())
      .order('placedAt', { ascending: true })

    // Group CLV by date
    const clvCurve = clvHistory?.reduce((acc: any[], bet: any) => {
      const date = new Date(bet.placedAt).toLocaleDateString()
      const existing = acc.find(x => x.date === date)
      if (existing) {
        existing.values.push(bet.clv)
      } else {
        acc.push({ date, values: [bet.clv] })
      }
      return acc
    }, []).map(d => ({
      date: d.date,
      clv: Number((d.values.reduce((a: number, b: number) => a + b, 0) / d.values.length).toFixed(4))
    })) || []

    const metrics = {
      totalBets: bets.length,
      settledBets: validBets.length,
      avgClv: Number(avgClv.toFixed(4)),
      positiveClvRate: Number((positiveClvRate * 100).toFixed(1)),
      maxClv: validBets.length > 0 ? Math.max(...clvValues) : 0,
      minClv: validBets.length > 0 ? Math.min(...clvValues) : 0,
      drawdown: Number((drawdown * 100).toFixed(1)),
      currentBalance: bankroll?.currentBalance || 0,
      peakBalance: bankroll?.peakBalance || 0,
      startingBalance: bankroll?.startingBalance || 0,
      realBets: bets.filter(b => !b.isShadow).length,
      shadowBets: shadowBets?.length || 0,
      realVsShadow: {
        realClv: Number(realClv.toFixed(4)),
        shadowClv: Number(shadowClv.toFixed(4))
      },
      clvTrend: avgClv > 0 ? 'up' : avgClv < 0 ? 'down' : 'neutral'
    }

    return NextResponse.json({
      success: true,
      experiment,
      metrics,
      balanceHistory: balanceCurve,
      clvHistory: clvCurve
    })
  } catch (error) {
    console.error('[DASHBOARD] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { experimentId } = body

    if (!experimentId) {
      return NextResponse.json({ error: 'experimentId required' }, { status: 400 })
    }

    // Trigger dashboard refresh (same as GET)
    const response = await GET(new Request(
      `http://localhost:3000/api/dashboard?experimentId=${experimentId}`
    ))

    return response
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
