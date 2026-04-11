import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * /api/metrics/diagnostic
 *
 * Shows WHERE edge actually exists:
 * - By market/league
 * - By system version
 * - By edge bucket (small vs large edge)
 * - By timing (early vs late market)
 *
 * This is how you find profitable hunting grounds
 */
export async function GET(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  try {
    const url = new URL(req.url)
    const league = url.searchParams.get('league')
    const limit = parseInt(url.searchParams.get('limit') || '500')

    // Fetch all settled predictions
    let query = supabase
      .from('predictions')
      .select(
        'id, league, system_version, edge_bucket, time_to_kickoff_hours, home_team, away_team, clv, market_movement, clp_error, signal_quality, edge'
      )
      .eq('settled', true)
      .order('settled_at', { ascending: false })
      .limit(limit)

    if (league) {
      query = query.eq('league', league)
    }

    const { data: settled } = await query

    if (!settled || settled.length === 0) {
      return NextResponse.json({
        message: 'No settled predictions yet',
        byLeague: null,
        byVersion: null,
        byEdgeBucket: null,
        byTiming: null,
      })
    }

    // ========== ANALYSIS 1: By League ==========
    const byLeague: Record<string, any> = {}

    for (const b of settled) {
      const league = b.league || 'unknown'
      if (!byLeague[league]) {
        byLeague[league] = {
          bets: 0,
          avgClv: 0,
          positiveClv: 0,
          avgMovement: 0,
          avgClpError: 0,
          avgSignalQuality: 0,
          bets_list: [],
        }
      }

      byLeague[league].bets++
      byLeague[league].avgClv += b.clv || 0
      if (b.clv > 0) byLeague[league].positiveClv++
      byLeague[league].avgMovement += b.market_movement || 0
      byLeague[league].avgClpError += Math.abs(b.clp_error || 0)
      byLeague[league].avgSignalQuality += b.signal_quality || 0
    }

    // Normalize averages
    for (const league in byLeague) {
      const data = byLeague[league]
      data.avgClv = Math.round((data.avgClv / data.bets) * 10000) / 10000
      data.positiveClvPct = Math.round((data.positiveClv / data.bets) * 1000) / 10
      data.avgMovement = Math.round((data.avgMovement / data.bets) * 10000) / 10000
      data.avgClpError = Math.round((data.avgClpError / data.bets) * 10000) / 10000
      data.avgSignalQuality = Math.round((data.avgSignalQuality / data.bets) * 1000) / 1000
      delete data.bets_list
    }

    // ========== ANALYSIS 2: By System Version ==========
    const byVersion: Record<string, any> = {}

    for (const b of settled) {
      const version = b.system_version || 'unknown'
      if (!byVersion[version]) {
        byVersion[version] = {
          bets: 0,
          avgClv: 0,
          positiveClv: 0,
          avgMovement: 0,
        }
      }

      byVersion[version].bets++
      byVersion[version].avgClv += b.clv || 0
      if (b.clv > 0) byVersion[version].positiveClv++
      byVersion[version].avgMovement += b.market_movement || 0
    }

    for (const version in byVersion) {
      const data = byVersion[version]
      data.avgClv = Math.round((data.avgClv / data.bets) * 10000) / 10000
      data.positiveClvPct = Math.round((data.positiveClv / data.bets) * 1000) / 10
      data.avgMovement = Math.round((data.avgMovement / data.bets) * 10000) / 10000
    }

    // ========== ANALYSIS 3: By Edge Bucket ==========
    const byEdgeBucket: Record<string, any> = {}

    for (const b of settled) {
      const bucket = b.edge_bucket || 'unknown'
      if (!byEdgeBucket[bucket]) {
        byEdgeBucket[bucket] = {
          bets: 0,
          avgClv: 0,
          positiveClv: 0,
          avgEdge: 0,
        }
      }

      byEdgeBucket[bucket].bets++
      byEdgeBucket[bucket].avgClv += b.clv || 0
      if (b.clv > 0) byEdgeBucket[bucket].positiveClv++
      byEdgeBucket[bucket].avgEdge += (b.edge || 0) * 100
    }

    for (const bucket in byEdgeBucket) {
      const data = byEdgeBucket[bucket]
      data.avgClv = Math.round((data.avgClv / data.bets) * 10000) / 10000
      data.positiveClvPct = Math.round((data.positiveClv / data.bets) * 1000) / 10
      data.avgEdge = Math.round((data.avgEdge / data.bets) * 100) / 100
    }

    // ========== ANALYSIS 4: By Timing ==========
    const byTiming: Record<string, any> = {}

    for (const b of settled) {
      let timing = 'unknown'
      if (b.time_to_kickoff_hours > 24) {
        timing = 'early_24h_plus'
      } else if (b.time_to_kickoff_hours > 6) {
        timing = 'mid_6_24h'
      } else {
        timing = 'late_under_6h'
      }

      if (!byTiming[timing]) {
        byTiming[timing] = {
          bets: 0,
          avgClv: 0,
          positiveClv: 0,
        }
      }

      byTiming[timing].bets++
      byTiming[timing].avgClv += b.clv || 0
      if (b.clv > 0) byTiming[timing].positiveClv++
    }

    for (const timing in byTiming) {
      const data = byTiming[timing]
      data.avgClv = Math.round((data.avgClv / data.bets) * 10000) / 10000
      data.positiveClvPct = Math.round((data.positiveClv / data.bets) * 1000) / 10
    }

    // ========== FIND WINNERS ==========
    const findWinner = (data: Record<string, any>) => {
      let winner: string | null = null
      let maxClv = -Infinity

      for (const key in data) {
        if (data[key].avgClv > maxClv) {
          maxClv = data[key].avgClv
          winner = key
        }
      }

      return { winner, clv: Math.round(maxClv * 10000) / 10000 }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalSettled: settled.length,
        byLeague: Object.keys(byLeague).length,
        byVersion: Object.keys(byVersion).length,
        byEdgeBucket: Object.keys(byEdgeBucket).length,
      },
      diagnostics: {
        byLeague: {
          data: byLeague,
          winner: findWinner(byLeague),
          recommendation:
            findWinner(byLeague).clv > 0
              ? `Focus on ${findWinner(byLeague).winner} (+${findWinner(byLeague).clv}% CLV)`
              : 'No league showing positive CLV yet',
        },
        byVersion: {
          data: byVersion,
          winner: findWinner(byVersion),
        },
        byEdgeBucket: {
          data: byEdgeBucket,
          insight: 'Shows if edge size correlates with actual CLV',
        },
        byTiming: {
          data: byTiming,
          insight: 'Shows if timing helps (early vs late market)',
        },
      },
    })
  } catch (err) {
    console.error('Diagnostic metrics error:', err)
    return NextResponse.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
