import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStake } from '@/lib/staking'
import { calculateMatchOdds, type TeamStats } from '@/lib/models/poisson-v2'
import { canPlaceBet } from '@/lib/risk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const SAMPLE_MATCHES = [
  { fixture_id: 'epl-001', home: 'Arsenal', away: 'Chelsea' },
  { fixture_id: 'epl-002', home: 'Manchester City', away: 'Liverpool' },
  { fixture_id: 'epl-003', home: 'Tottenham', away: 'Manchester United' },
  { fixture_id: 'epl-004', home: 'Newcastle', away: 'Brighton' },
  { fixture_id: 'epl-005', home: 'Aston Villa', away: 'West Ham' },
]

// Min edge for V2 (stricter than V1)
const MIN_EDGE_V2 = 0.03

/**
 * /api/seed-signals-v2
 * 
 * Generate V2 signals (parallel to V1)
 * Uses adjusted Poisson with random team stats for testing
 */
export async function POST() {
  try {
    const signals: any[] = []

    // Generate 5 random V2 signals
    for (let i = 0; i < 5; i++) {
      const match = SAMPLE_MATCHES[Math.floor(Math.random() * SAMPLE_MATCHES.length)]

      // Generate random but realistic team stats
      const homeAttack = 0.8 + Math.random() * 1.2
      const homeDefense = 0.8 + Math.random() * 1.2
      const awayAttack = 0.8 + Math.random() * 1.2
      const awayDefense = 0.8 + Math.random() * 1.2

      const homeTeam: TeamStats = {
        name: match.home,
        attack: homeAttack,
        defense: homeDefense,
      }

      const awayTeam: TeamStats = {
        name: match.away,
        attack: awayAttack,
        defense: awayDefense,
      }

      // Calculate probabilities using adjusted Poisson
      const matchOdds = calculateMatchOdds(homeTeam, awayTeam)

      // Randomly select home/draw/away
      const outcomes = [
        { prob: matchOdds.homeWinProb, name: 'HOME' },
        { prob: matchOdds.drawProb, name: 'DRAW' },
        { prob: matchOdds.awayWinProb, name: 'AWAY' },
      ]

      const selected = outcomes[Math.floor(Math.random() * 3)]
      const modelProbability = selected.prob

      // Generate realistic market odds (slightly undervaluing this probability)
      const impliedProb = modelProbability * (0.95 + Math.random() * 0.05) // 95-100% of model
      const oddsTaken = 1 / impliedProb

      // Calculate edge
      const edge = modelProbability * oddsTaken - 1

      // Skip if below minimum edge threshold for V2
      if (edge < MIN_EDGE_V2) continue

      // Risk check
      const openBets = await supabase
        .from('predictions')
        .select('stake')
        .eq('settled', false)
        .eq('system_version', 'v2')
        .then((res) => res.data || [])

      const openExposure = openBets.reduce(
        (sum: number, bet: any) => sum + (bet.stake || 0),
        0
      )

      const bankrollRes = await supabase
        .from('bankroll_state')
        .select('bankroll')
        .eq('id', 1)
        .single()

      const currentBankroll = bankrollRes.data?.bankroll || 1000

      const stake = getStake(modelProbability, oddsTaken)
      const riskCheck = canPlaceBet({
        bankroll: currentBankroll,
        proposedStake: stake,
        openExposure,
      })

      if (!riskCheck.allowed) continue

      // Random kickoff within next 7 days
      const kickoffDate = new Date()
      kickoffDate.setDate(kickoffDate.getDate() + Math.floor(Math.random() * 7))
      kickoffDate.setHours(15 + Math.floor(Math.random() * 8), 0, 0, 0)

      // Insert to database with V2 tags
      const { data } = await supabase
        .from('predictions')
        .insert({
          match_id: `${match.fixture_id}-${Date.now()}-${i}`,
          home_team: match.home,
          away_team: match.away,
          market: selected.name,
          model_probability: modelProbability,
          odds_taken: oddsTaken,
          implied_probability: 1 / oddsTaken,
          edge: parseFloat(edge.toFixed(4)),
          stake,
          placed_at: new Date().toISOString(),
          kickoff_at: kickoffDate.toISOString(),
          event_start: kickoffDate.toISOString(),
          result: null,
          closing_odds: null,
          settled_at: null,
          clv: null,
          settled: false,
          // V2 TAGS
          model_version: 'poisson_adj_v2',
          odds_version: 'weighted_sharp_v2',
          staking_version: 'kelly_0.25_v1',
          system_version: 'v2',
        })
        .select()

      if (data) {
        signals.push({
          match: `${match.home} vs ${match.away}`,
          market: selected.name,
          edge: parseFloat(edge.toFixed(3)),
          stake,
          modelProb: parseFloat((modelProbability * 100).toFixed(1)),
          homeXG: parseFloat(matchOdds.homeXG.toFixed(2)),
          awayXG: parseFloat(matchOdds.awayXG.toFixed(2)),
          id: data[0]?.id,
        })
      }
    }

    return NextResponse.json({
      success: true,
      system: 'v2',
      created: signals.length,
      signals,
      note: 'V2 signals (adjusted Poisson + weighted odds) generated in parallel with V1',
    })
  } catch (err) {
    console.error('Seed V2 error:', err)
    return NextResponse.json(
      { error: `Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
