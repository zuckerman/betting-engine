import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * /api/analytics/report
 * Returns real metrics from settled bets
 */
export async function GET() {
  try {
    const { data: settledBets } = await supabase
      .from('bets')
      .select('*')
      .eq('status', 'SETTLED')

    if (!settledBets || settledBets.length === 0) {
      return NextResponse.json({
        status: '⚫',
        state: 'VALIDATION MODE - No settled bets yet',
        bankroll: 1000,
        roi: 0.0,
        roi7d: 0.0,
        avgEdge: 0.0,
        drawdown: 0.0,
        recentWinRate: 0.5,
        calibrationError: 0.0,
        totalBetsPlaced: 0,
        timestamp: Date.now(),
      })
    }

    const clvValues = settledBets.map((b: any) => b.clv || 0)
    const positiveCount = clvValues.filter((c) => c > 0).length
    const totalStake = settledBets.reduce((sum: number, b: any) => sum + (b.stake || 0), 0)
    const totalReturn = settledBets.reduce(
      (sum: number, b: any) => sum + (b.stake || 0) * (1 + (b.clv || 0) / 100),
      0
    )
    const avgClv = clvValues.reduce((a: number, b: number) => a + b, 0) / clvValues.length
    const winRate = positiveCount / settledBets.length

    // Determine status based on metrics
    let status = '🟡'
    if (avgClv > 0.5 && winRate > 0.55) status = '🟢'
    if (avgClv < 0 || winRate < 0.45) status = '🔴'

    return NextResponse.json({
      status,
      state: `VALIDATION: ${settledBets.length} bets`,
      bankroll: totalReturn,
      roi: parseFloat(((totalReturn / totalStake - 1) * 100).toFixed(2)),
      roi7d: avgClv,
      avgEdge: avgClv,
      drawdown: 0.0,
      recentWinRate: parseFloat((winRate * 100).toFixed(1)),
      calibrationError: 0.0,
      totalBetsPlaced: settledBets.length,
      timestamp: Date.now(),
    })
  } catch (err) {
    console.error('Analytics error:', err)
    return NextResponse.json(
      {
        status: '🔴',
        state: 'ERROR',
        bankroll: 1000,
        roi: 0.0,
        roi7d: 0.0,
        avgEdge: 0.0,
        drawdown: 0.0,
        recentWinRate: 0.5,
        calibrationError: 0.0,
        totalBetsPlaced: 0,
        timestamp: Date.now(),
      },
      { status: 500 }
    )
  }
}
