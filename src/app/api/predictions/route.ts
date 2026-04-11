import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * /api/predictions
 *
 * Debug endpoint to view all predictions
 * Shows status, CLV, edges - visibility into signal pipeline
 */
export async function GET(request: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  try {
    const url = new URL(request.url)
    const settled = url.searchParams.get('settled')
    const limit = url.searchParams.get('limit') || '50'

    let query = supabase
      .from('predictions')
      .select(
        'id, home_team, away_team, market, model_probability, odds_taken, edge, placed_at, kickoff_at, settled, closing_odds, clv, settled_at'
      )
      .order('placed_at', { ascending: false })
      .limit(parseInt(limit))

    // Optional filter by settled status
    if (settled === 'true') {
      query = query.eq('settled', true)
    } else if (settled === 'false') {
      query = query.eq('settled', false)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({
        count: 0,
        predictions: [],
      })
    }

    // Format for readability
    const predictions = data.map((p: any) => ({
      id: p.id,
      match: `${p.home_team} vs ${p.away_team}`,
      market: p.market,
      status: p.settled ? 'SETTLED' : 'OPEN',
      edge: p.edge ? `${(p.edge * 100).toFixed(2)}%` : 'N/A',
      entryOdds: parseFloat(p.odds_taken?.toFixed(3) || '0'),
      closingOdds: p.closing_odds ? parseFloat(p.closing_odds.toFixed(3)) : null,
      clv: p.clv ? `${p.clv.toFixed(2)}%` : null,
      placed: new Date(p.placed_at).toISOString().split('T')[1].split('.')[0],
      kickoff: new Date(p.kickoff_at).toISOString().split('T')[0],
    }))

    // Summary stats
    const total = predictions.length
    const settled_count = predictions.filter((p: any) => p.status === 'SETTLED').length
    const open_count = total - settled_count
    const avgClv = 
      predictions
        .filter((p: any) => p.clv)
        .reduce((sum: number, p: any) => sum + parseFloat(p.clv), 0) / Math.max(settled_count, 1)

    return NextResponse.json({
      summary: {
        total,
        open: open_count,
        settled: settled_count,
        avgCLV: `${avgClv.toFixed(2)}%`,
      },
      predictions,
    })
  } catch (err) {
    console.error('Predictions error:', err)
    return NextResponse.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
