import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * /api/seed-signals-past
 * 
 * Generate test signals with PAST kickoff times
 * Used for testing real CLV settlement (for development/validation only)
 */
export async function POST() {
  const SAMPLE_MATCHES = [
    { fixture_id: 'epl-001', home: 'Arsenal', away: 'Chelsea' },
    { fixture_id: 'epl-002', home: 'Manchester City', away: 'Liverpool' },
    { fixture_id: 'epl-003', home: 'Tottenham', away: 'Manchester United' },
    { fixture_id: 'epl-004', home: 'Newcastle', away: 'Brighton' },
    { fixture_id: 'epl-005', home: 'Aston Villa', away: 'West Ham' },
  ]

  const signals: any[] = []

  for (let i = 0; i < 5; i++) {
    const match = SAMPLE_MATCHES[i]

    // Generate realistic probabilities
    const modelProbability = 0.48 + Math.random() * 0.04 // 48-52%
    const oddsTaken = 1.9 + Math.random() * 0.4 // 1.9-2.3

    // Calculate edge
    const edge = (modelProbability * oddsTaken) - 1

    // Skip if no edge
    if (edge <= 0) {
      continue
    }

    // Set kickoff to 2 hours AGO (already past, ready to settle)
    const kickoffDate = new Date()
    kickoffDate.setHours(kickoffDate.getHours() - 2)

    // Insert into database
    const { data, error } = await supabase
      .from('predictions')
      .insert({
        fixture_id: `${match.fixture_id}-${Date.now()}-${i}`,
        home_team: match.home,
        away_team: match.away,
        market: 'MATCH_ODDS',
        model_probability: modelProbability,
        odds_taken: oddsTaken,
        edge,
        placed_at: new Date().toISOString(),
        kickoff_at: kickoffDate.toISOString(),
        settled: false,
        closing_odds: null,
        clv: null,
        settled_at: null,
      })
      .select('id')

    if (!error && data) {
      signals.push({
        match: `${match.home} vs ${match.away}`,
        edge: parseFloat((edge * 100).toFixed(2)),
        kickoff: kickoffDate.toISOString(),
        id: data[0]?.id,
      })
    }
  }

  return NextResponse.json({
    success: true,
    created: signals.length,
    note: 'These signals have past kickoff times - ready to settle immediately',
    signals,
  })
}

export const dynamic = 'force-dynamic'
