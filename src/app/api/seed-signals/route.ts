import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Sample matches for validation phase
const SAMPLE_MATCHES = [
  { fixture_id: 'epl-001', home: 'Arsenal', away: 'Chelsea' },
  { fixture_id: 'epl-002', home: 'Manchester City', away: 'Liverpool' },
  { fixture_id: 'epl-003', home: 'Tottenham', away: 'Manchester United' },
  { fixture_id: 'epl-004', home: 'Newcastle', away: 'Brighton' },
  { fixture_id: 'epl-005', home: 'Aston Villa', away: 'West Ham' },
]

/**
 * /api/seed-signals
 * 
 * Generates test signals for validation phase
 * Can be called manually or via cron
 */
export async function POST() {
  try {
    const signals = []

    // Generate 5 random signals
    for (let i = 0; i < 5; i++) {
      const match = SAMPLE_MATCHES[Math.floor(Math.random() * SAMPLE_MATCHES.length)]

      // Generate realistic but varied probabilities
      const modelProbability = 0.48 + Math.random() * 0.04
      const oddsTaken = 1.9 + Math.random() * 0.4

      // Calculate edge correctly: (prob × odds) - 1
      const edge = (modelProbability * oddsTaken) - 1

      // Skip if no positive edge
      if (edge <= 0) continue

      // Random kickoff within next 7 days
      const kickoffDate = new Date()
      kickoffDate.setDate(kickoffDate.getDate() + Math.floor(Math.random() * 7))
      kickoffDate.setHours(15 + Math.floor(Math.random() * 8), 0, 0, 0)

      // Insert directly to database
      const { data, error } = await supabase
        .from('predictions')
        .insert({
          match_id: `${match.fixture_id}-${Date.now()}-${i}`,
          home_team: match.home,
          away_team: match.away,
          market: 'MATCH_ODDS',
          model_probability: modelProbability,
          odds_taken: oddsTaken,
          implied_probability: 1 / oddsTaken,
          edge: parseFloat(edge.toFixed(4)),
          placed_at: new Date().toISOString(),
          kickoff_at: kickoffDate.toISOString(),
          event_start: kickoffDate.toISOString(),
          result: null,
          closing_odds: null,
          settled_at: null,
          clv: null,
          settled: false,
        })
        .select()

      if (data) {
        signals.push({
          match: `${match.home} vs ${match.away}`,
          edge: parseFloat(edge.toFixed(3)),
          id: data[0]?.id,
        })
      }
    }

    return NextResponse.json({
      success: true,
      created: signals.length,
      signals,
    })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
