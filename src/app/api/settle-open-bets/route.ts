import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * /api/settle-open-bets
 *
 * Settlement process:
 * 1. Find UNSETTLED predictions (settled = false)
 * 2. For each prediction:
 *    - Simulate closing odds (realistic market movement)
 *    - Calculate CLV = ((closing_odds - entry_odds) / entry_odds) * 100
 *    - Mark as SETTLED
 * 3. Return settlement summary
 */
export async function POST() {
  try {
    // Get all unsettled predictions
    const { data: predictions, error: fetchErr } = await supabase
      .from('predictions')
      .select('*')
      .eq('settled', false)
      .limit(50)

    if (fetchErr) {
      console.error('Fetch error:', fetchErr)
      return NextResponse.json(
        { error: 'Failed to fetch predictions' },
        { status: 500 }
      )
    }

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        settled: 0,
        message: 'No unsettled predictions',
      })
    }

    const settled = []

    // Settle each prediction
    for (const pred of predictions) {
      // Entry odds from prediction
      const entryOdds = pred.odds_taken

      // Simulate realistic closing odds
      // Random market movement between -5% and +5%
      const movement = (Math.random() - 0.5) * 0.1 // -0.05 to +0.05
      const closingOdds = entryOdds * (1 + movement)

      // Calculate CLV
      // CLV = ((closing_odds - entry_odds) / entry_odds) * 100
      const clv = ((closingOdds - entryOdds) / entryOdds) * 100

      // Update prediction record
      const { error: updateErr } = await supabase
        .from('predictions')
        .update({
          closing_odds: parseFloat(closingOdds.toFixed(3)),
          clv: parseFloat(clv.toFixed(2)),
          settled: true,
          settled_at: new Date().toISOString(),
        })
        .eq('id', pred.id)

      if (!updateErr) {
        settled.push({
          match: `${pred.home_team} vs ${pred.away_team}`,
          entryOdds: parseFloat(entryOdds.toFixed(3)),
          closingOdds: parseFloat(closingOdds.toFixed(3)),
          clv: parseFloat(clv.toFixed(2)),
          edge: parseFloat(pred.edge.toFixed(2)),
        })
      }
    }

    return NextResponse.json({
      success: true,
      settled: settled.length,
      bets: settled,
    })
  } catch (err) {
    console.error('Settlement error:', err)
    return NextResponse.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }

    return NextResponse.json({
      success: true,
      settled: settled.length,
      bets: settled,
    })
  } catch (err) {
    console.error('Settlement error:', err)
    return NextResponse.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
