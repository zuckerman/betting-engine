import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * /api/metrics/by-version
 *
 * Compare performance across system versions
 * Shows CLV, ROI, win rate split by v1 vs v2
 * This is the A/B test comparison dashboard
 */
export async function GET(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  try {
    const url = new URL(req.url)
    const modelVersion = url.searchParams.get('model_version')
    const limit = parseInt(url.searchParams.get('limit') || '100')

    // Fetch all settled predictions
    let query = supabase
      .from('predictions')
      .select(
        'id, home_team, away_team, market, edge, odds_taken, stake, clv, settled, model_version, odds_version, staking_version, system_version, placed_at, settled_at'
      )
      .eq('settled', true)
      .order('settled_at', { ascending: false })
      .limit(limit)

    const { data: settled } = await query

    if (!settled || settled.length === 0) {
      return NextResponse.json({
        message: 'No settled predictions yet',
        v1: null,
        v2: null,
        comparison: null,
      })
    }

    // Split by version
    const v1Bets = settled.filter((b: any) => b.system_version === 'v1')
    const v2Bets = settled.filter((b: any) => b.system_version === 'v2')

    // Calculate metrics for each version
    function calculateMetrics(bets: any[]) {
      if (bets.length === 0) return null

      const settled = bets.filter((b: any) => b.settled)
      if (settled.length === 0) return null

      const totalStaked = settled.reduce((sum: number, b: any) => sum + (b.stake || 0), 0)
      const totalReturn = settled.reduce((sum: number, b: any) => {
        if (!b.clv) return sum
        const clvPercent = typeof b.clv === 'string' ? parseFloat(b.clv) : b.clv
        return sum + b.stake * clvPercent
      }, 0)

      const roi = totalStaked > 0 ? (totalReturn / totalStaked) * 100 : 0

      const avgClv = settled.reduce((sum: number, b: any) => {
        if (!b.clv) return sum
        const clvPercent = typeof b.clv === 'string' ? parseFloat(b.clv) : b.clv
        return sum + clvPercent
      }, 0) / settled.length

      const positiveClv = settled.filter((b: any) => {
        if (!b.clv) return false
        const clvPercent = typeof b.clv === 'string' ? parseFloat(b.clv) : b.clv
        return clvPercent > 0
      }).length

      const avgEdge = settled.reduce((sum: number, b: any) => sum + (b.edge || 0), 0) / settled.length
      const avgOdds = settled.reduce((sum: number, b: any) => sum + (b.odds_taken || 0), 0) / settled.length
      const avgStake = totalStaked / settled.length

      return {
        total: settled.length,
        totalStaked: Math.round(totalStaked * 100) / 100,
        totalReturn: Math.round(totalReturn * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        avgClv: Math.round(avgClv * 10000) / 100,
        positiveClv,
        positiveClvPercent: Math.round((positiveClv / settled.length) * 1000) / 10,
        avgEdge: Math.round(avgEdge * 10000) / 100,
        avgOdds: Math.round(avgOdds * 100) / 100,
        avgStake: Math.round(avgStake * 100) / 100,
      }
    }

    const v1Metrics = calculateMetrics(v1Bets)
    const v2Metrics = calculateMetrics(v2Bets)

    // Calculate comparison
    let comparison = null
    if (v1Metrics && v2Metrics) {
      const clvDiff = v2Metrics.avgClv - v1Metrics.avgClv
      const roiDiff = v2Metrics.roi - v1Metrics.roi
      const winner = clvDiff > 0 ? 'v2' : 'v1'
      const confidencePercent =
        v2Metrics.total >= 20 && v1Metrics.total >= 20
          ? Math.round(Math.abs(clvDiff) / (Math.abs(v1Metrics.avgClv) + 0.001) * 100)
          : 0

      comparison = {
        winner: confidencePercent > 10 ? winner : 'inconclusive',
        clvDifference: Math.round(clvDiff * 100) / 100,
        roiDifference: Math.round(roiDiff * 100) / 100,
        recommendation:
          confidencePercent > 50 && clvDiff > 0
            ? 'Promote v2 - significantly better CLV'
            : confidencePercent > 50 && clvDiff < 0
              ? 'Keep v1 - v2 underperforming'
              : 'Continue testing - insufficient data',
        sampleSizeV1: v1Metrics.total,
        sampleSizeV2: v2Metrics.total,
        minSampleForConfidence: 30,
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      v1: v1Metrics
        ? {
            system: 'v1 (Baseline: Poisson + Sharp Avg)',
            ...v1Metrics,
          }
        : { system: 'v1', total: 0, message: 'No v1 bets settled yet' },
      v2: v2Metrics
        ? {
            system: 'v2 (Upgraded: Adj Poisson + Weighted Sharp)',
            ...v2Metrics,
          }
        : { system: 'v2', total: 0, message: 'No v2 bets settled yet' },
      comparison:
        comparison ||
        {
            message: 'Awaiting enough settled bets to compare (need 20+ per version)',
          },
    })
  } catch (err) {
    console.error('Metrics error:', err)
    return NextResponse.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
