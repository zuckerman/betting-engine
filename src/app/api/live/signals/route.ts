import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStake } from '@/lib/staking'

/**
 * /api/live/signals
 *
 * Returns active predictions formatted for the dashboard
 */
export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  try {
    // Fetch unsettled predictions from database
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .is('settled', false)
      .order('placed_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json([]) // Return empty array on error
    }

    // Transform DB format to Signal format
    const signals = (data || []).map((pred: any) => ({
      fixture_id: pred.match_id || pred.id,
      home: pred.home_team || 'Unknown',
      away: pred.away_team || 'Unknown',
      market: pred.market || 'Unknown',
      odds: pred.odds_taken || 0,
      model_odds: pred.model_probability ? 1 / pred.model_probability : 0,
      edge: pred.edge || 0,
      urgency:
        pred.edge > 0.05  // >5% = HIGH edge
          ? 'HIGH'
          : pred.edge > 0.02  // >2% = MEDIUM edge
            ? 'MEDIUM'
            : 'LOW',
      decision: {
        action: 'BET' as const,
        stake: getStake(pred.model_probability || 0, pred.odds_taken || 0),
      },
    }))

    // Return as flat array (not wrapped object)
    return NextResponse.json(signals)
  } catch (err) {
    console.error('Error fetching signals:', err)
    return NextResponse.json([])
  }
}
