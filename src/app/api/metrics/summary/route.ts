import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * /api/metrics/summary
 *
 * Returns dashboard metrics from settled bets:
 * - Total bets placed
 * - Average CLV
 * - Win rate (positive CLV %)
 * - Avg spread
 * - Total ROI
 */
export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  try {
    // Get all settled bets
    const { data: settledBets } = await supabase
      .from('bets')
      .select('*')
      .eq('status', 'SETTLED')

    if (!settledBets || settledBets.length === 0) {
      return NextResponse.json({
        totalBets: 0,
        avgClv: 0,
        positiveClv: 0,
        winRate: 0,
        spreadAvg: 0,
        totalRoi: 0,
      })
    }

    const clvValues = settledBets.map((b: any) => b.clv || 0)
    const positiveCount = clvValues.filter((c) => c > 0).length
    const totalStake = settledBets.reduce((sum: number, b: any) => sum + (b.stake || 0), 0)
    const totalReturn = settledBets.reduce(
      (sum: number, b: any) => sum + (b.stake || 0) * (1 + (b.clv || 0) / 100),
      0
    )

    return NextResponse.json({
      totalBets: settledBets.length,
      avgClv: parseFloat((clvValues.reduce((a: number, b: number) => a + b, 0) / clvValues.length).toFixed(2)),
      positiveClv: positiveCount,
      winRate: parseFloat(((positiveCount / settledBets.length) * 100).toFixed(1)),
      totalRoi: parseFloat(((totalReturn / totalStake - 1) * 100).toFixed(2)),
    })
  } catch (err) {
    console.error('Metrics error:', err)
    return NextResponse.json(
      {
        totalBets: 0,
        avgClv: 0,
        positiveClv: 0,
        winRate: 0,
        totalRoi: 0,
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
